package com.aishield;

import com.adobe.xmp.XMPException;
import com.adobe.xmp.XMPMeta;
import com.adobe.xmp.XMPMetaFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.util.Map;
import java.util.HashMap;

@SpringBootApplication
@RestController
public class AiShieldApplication {

    private static final Logger log = LoggerFactory.getLogger(AiShieldApplication.class);

    public static void main(String[] args) {
        // Starts the Spring Boot HTTP Server on port 8080 by default
        SpringApplication.run(AiShieldApplication.class, args);
    }

    // This class maps the incoming JSON from Node.js
    public static class SignRequest {
        public String filePath;
        public String clientId;
    }

    @PostMapping("/api/sign-local")
    public ResponseEntity<Map<String, String>> signAsset(@RequestBody SignRequest request) {
        Map<String, String> response = new HashMap<>();

        try {
            log.info("Received signing request for file: {} from client: {}", request.filePath, request.clientId);
            File imageFile = new File(request.filePath);
            BufferedImage image = ImageIO.read(imageFile);

            if (image == null) {
                response.put("error", "Unsupported image format");
                return ResponseEntity.badRequest().body(response);
            }

            // 1. Apply Near-Invisible Watermark
            Graphics2D g2d = (Graphics2D) image.getGraphics();
            AlphaComposite alphaChannel = AlphaComposite.getInstance(AlphaComposite.SRC_OVER, 0.06f);
            g2d.setComposite(alphaChannel);
            g2d.setColor(Color.BLACK);
            g2d.setFont(new Font("Arial", Font.BOLD, 40));

            for (int x = 0; x < image.getWidth(); x += 300) {
                for (int y = 0; y < image.getHeight(); y += 150) {
                    g2d.drawString("SECURED: " + request.clientId, x, y);
                }
            }
            g2d.dispose();

            // 2. Generate XMP Metadata Packet
            String xmpPacket = generateMeityXMP(request.clientId);

            // 3. Save the modified image back to disk
            String extension = request.filePath.substring(request.filePath.lastIndexOf('.') + 1);
            ImageIO.write(image, extension, imageFile);

            // 4. Return success manifest as JSON
            response.put("status", "COMPLIANT");
            response.put("info", "Visual Watermark Applied Successfully");
            response.put("xmp_payload", xmpPacket);

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            response.put("error", e.getMessage());
            return ResponseEntity.internalServerError().body(response);
        }
    }

    private String generateMeityXMP(String clientId) throws XMPException {
        XMPMeta meta = XMPMetaFactory.create();
        String namespaceURI = "http://india.meity.gov.in/rules2026/";
        XMPMetaFactory.getSchemaRegistry().registerNamespace(namespaceURI, "meity");
        meta.setProperty(namespaceURI, "isSynthetic", "true");
        meta.setProperty(namespaceURI, "originPlatform", "AI-Shield-India");
        meta.setProperty(namespaceURI, "certifiedBy", clientId);
        return XMPMetaFactory.serializeToString(meta, null);
    }
}