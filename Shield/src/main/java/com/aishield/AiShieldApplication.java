package com.aishield;

import com.adobe.xmp.XMPException;
import com.adobe.xmp.XMPMeta;
import com.adobe.xmp.XMPMetaFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Map;
import java.util.HashMap;

@SpringBootApplication
@RestController
public class AiShieldApplication {

    private static final Logger log = LoggerFactory.getLogger(AiShieldApplication.class);

    public static void main(String[] args) {
        SpringApplication.run(AiShieldApplication.class, args);
    }

    @PostMapping(value = "/api/sign-local", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> signAsset(
            @RequestParam("file") MultipartFile file,
            @RequestParam("clientId") String clientId) {

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }

        try {
            log.info("Processing file: {} ({} bytes) for client: {}",
                    file.getOriginalFilename(), file.getSize(), clientId);

            // Read the image
            BufferedImage image = ImageIO.read(file.getInputStream());

            // CRITICAL: Check if image is null BEFORE using it
            if (image == null) {
                log.error("ImageIO could not decode the file format for: {}", file.getOriginalFilename());
                return ResponseEntity.status(415).body("Unsupported or corrupt image format");
            }

            // 1. Apply Watermark
            Graphics2D g2d = (Graphics2D) image.getGraphics();
            AlphaComposite alphaChannel = AlphaComposite.getInstance(AlphaComposite.SRC_OVER, 0.1f);
            g2d.setComposite(alphaChannel);
            g2d.setColor(Color.GRAY);
            g2d.setFont(new Font("Arial", Font.BOLD, 30));

            for (int x = 0; x < image.getWidth(); x += 300) {
                for (int y = 0; y < image.getHeight(); y += 150) {
                    g2d.drawString("SECURED: " + clientId, x, y);
                }
            }
            g2d.dispose();

            // 2. Generate Metadata
            String xmpPacket = generateMeityXMP(clientId);

            // 3. Convert to Bytes
            String format = "png"; // Default to PNG for better compatibility
            if (file.getContentType() != null && file.getContentType().contains("jpeg")) {
                format = "jpg";
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, format, baos);
            byte[] imageBytes = baos.toByteArray();

            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(file.getContentType()))
                    .header("X-XMP-Payload", xmpPacket)
                    .body(imageBytes);

        } catch (Exception e) {
            log.error("Internal Error: ", e);
            return ResponseEntity.internalServerError().body("Error: " + e.getMessage());
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