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

    // Change: Now accepts MultipartFile and clientId as a RequestParam
    @PostMapping(value = "/api/sign-local", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<byte[]> signAsset(
            @RequestParam("file") MultipartFile file,
            @RequestParam("clientId") String clientId) {

        try {
            log.info("Received signing request for file: {} from client: {}", file.getOriginalFilename(), clientId);

            // Read the image from the uploaded stream
            BufferedImage image = ImageIO.read(file.getInputStream());

            if (image == null) {
                return ResponseEntity.badRequest().build();
            }

            // 1. Apply Near-Invisible Watermark
            Graphics2D g2d = (Graphics2D) image.getGraphics();
            AlphaComposite alphaChannel = AlphaComposite.getInstance(AlphaComposite.SRC_OVER, 0.06f);
            g2d.setComposite(alphaChannel);
            g2d.setColor(Color.BLACK);
            g2d.setFont(new Font("Arial", Font.BOLD, 40));

            for (int x = 0; x < image.getWidth(); x += 300) {
                for (int y = 0; y < image.getHeight(); y += 150) {
                    g2d.drawString("SECURED: " + clientId, x, y);
                }
            }
            g2d.dispose();

            // 2. Generate XMP Metadata (Logic remains same)
            String xmpPacket = generateMeityXMP(clientId);

            // 3. Convert modified image to Byte Array to send back to Node.js
            String contentType = file.getContentType();
            String formatName = (contentType != null && contentType.contains("png")) ? "png" : "jpg";

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, formatName, baos);
            byte[] imageBytes = baos.toByteArray();

            // 4. Return the processed image bytes
            // Note: We send the image back. Node.js will handle the Manifest logging.
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header("X-XMP-Payload", xmpPacket) // Send metadata in header
                    .body(imageBytes);

        } catch (Exception e) {
            log.error("Error processing image", e);
            return ResponseEntity.internalServerError().build();
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