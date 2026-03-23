package com.aishield;

import com.adobe.xmp.XMPException;
import com.adobe.xmp.XMPMeta;
import com.adobe.xmp.XMPMetaFactory;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@SpringBootApplication
@RestController
public class AiShieldApplication {

    public static void main(String[] args) {
        SpringApplication.run(AiShieldApplication.class, args);
    }

    @PostMapping("/api/sign-local")
    public ResponseEntity<byte[]> signAsset(
            @RequestParam("asset") MultipartFile file,
            @RequestParam("clientId") String clientId) {

        try {
            // 1. Read image from the uploaded multipart stream
            BufferedImage image = ImageIO.read(file.getInputStream());

            if (image == null) {
                return ResponseEntity.badRequest().build();
            }

            // 2. Apply Near-Invisible Watermark
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

            // 3. Generate XMP Metadata and Encode to Base64
            // This prevents the Unicode BOM error in HTTP headers
            String xmpPacket = generateMeityXMP(clientId);
            String encodedXmp = Base64.getEncoder().encodeToString(xmpPacket.getBytes());

            // 4. Convert modified image to byte array
            String originalName = file.getOriginalFilename();
            String extension = "png";
            if (originalName != null && originalName.contains(".")) {
                extension = originalName.substring(originalName.lastIndexOf('.') + 1);
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            ImageIO.write(image, extension, baos);
            byte[] imageBytes = baos.toByteArray();

            // 5. Return the image bytes and include encoded XMP in the headers
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(file.getContentType()));
            headers.add("X-XMP-Payload", encodedXmp);

            return ResponseEntity.ok()
                    .headers(headers)
                    .body(imageBytes);

        } catch (Exception e) {
            e.printStackTrace();
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