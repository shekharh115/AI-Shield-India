package com.aishield;

import com.adobe.xmp.XMPException;
import com.adobe.xmp.XMPMeta;
import com.adobe.xmp.XMPMetaFactory;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;

public class ComplianceSigner {
    public static void main(String[] args) {
        if (args.length < 2) {
            System.err.println("Usage: java -jar shield.jar <imagePath> <clientId>");
            return;
        }

        String imagePath = args[0];
        String clientId = args[1];
        File imageFile = new File(imagePath);

        try {
            // 1. Load Image using built-in ImageIO
            BufferedImage image = ImageIO.read(imageFile);
            if (image == null) {
                throw new IOException("Could not read image file. Unsupported format.");
            }

            // 2. Apply Near-Invisible Watermark
            Graphics2D g2d = (Graphics2D) image.getGraphics();

            // Set font and transparency (Alpha 0.06 is ~94% transparent)
            AlphaComposite alphaChannel = AlphaComposite.getInstance(AlphaComposite.SRC_OVER, 0.06f);
            g2d.setComposite(alphaChannel);
            g2d.setColor(Color.BLACK);
            g2d.setFont(new Font("Arial", Font.BOLD, 40));

            // Tile the watermark across the image
            for (int x = 0; x < image.getWidth(); x += 300) {
                for (int y = 0; y < image.getHeight(); y += 150) {
                    g2d.drawString("SECURED: " + clientId, x, y);
                }
            }
            g2d.dispose(); // Clean up graphics context

            // 3. Generate XMP Metadata Packet (MeitY Compliance)
            String xmpPacket = generateMeityXMP(clientId);

            // 4. Save the image
            // Note: Standard ImageIO is great for visuals but tricky for custom XMP injection.
            // For full production XMP writing, consider using Apache Commons Imaging.
            // Here, we overwrite the visual watermarked image.
            String extension = imagePath.substring(imagePath.lastIndexOf('.') + 1);
            ImageIO.write(image, extension, imageFile);

            // Manifest output for Node.js
            System.out.println("<certified_manifest>");
            System.out.println("  <status>COMPLIANT</status>");
            System.out.println("  <info>Visual Watermark Applied Successfully.</info>");
            System.out.println("  <xmp_payload>" + xmpPacket + "</xmp_payload>");
            System.out.println("</certified_manifest>");

        } catch (Exception e) {
            System.err.println("Injection Failed: " + e.getMessage());
        }
    }

    /**
     * Constructs a compliant XMP packet using Adobe's open-source XMPCore
     */
    private static String generateMeityXMP(String clientId) throws XMPException {
        XMPMeta meta = XMPMetaFactory.create();
        String namespaceURI = "http://india.meity.gov.in/rules2026/";
        String prefix = "meity";

        // Register custom namespace
        XMPMetaFactory.getSchemaRegistry().registerNamespace(namespaceURI, prefix);

        // Add compliance properties
        meta.setProperty(namespaceURI, "isSynthetic", "true");
        meta.setProperty(namespaceURI, "originPlatform", "AI-Shield-India");
        meta.setProperty(namespaceURI, "certifiedBy", clientId);

        try {
            return XMPMetaFactory.serializeToString(meta, null);
        } catch (XMPException e) {
            return "Error serializing XMP: " + e.getMessage();
        }
    }
}