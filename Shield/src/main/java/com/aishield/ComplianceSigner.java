package com.aishield;

import com.aspose.imaging.Image;
import com.aspose.imaging.RasterImage;
import com.aspose.imaging.Graphics;
import com.aspose.imaging.Font;
import com.aspose.imaging.Color;
import com.aspose.imaging.brushes.SolidBrush;
import com.aspose.imaging.xmp.XmpPacketWrapper;
import com.aspose.imaging.xmp.XmpPackage;

public class ComplianceSigner {
    public static void main(String[] args) {
        if (args.length < 2) {
            System.err.println("Usage: java -jar shield.jar <imagePath> <clientId>");
            return;
        }

        String imagePath = args[0];
        String clientId = args[1];

        // 1. Load and cast to RasterImage to access XMP and Drawing features
        try (RasterImage image = (RasterImage) Image.load(imagePath)) {

            // 2. Apply Near-Invisible Watermark
            Graphics graphics = new Graphics(image);
            Font font = new Font("Arial", 40);
            SolidBrush brush = new SolidBrush(Color.fromArgb(15, 0, 0, 0)); // 15 Alpha is ~94% transparent

            for (int x = 0; x < image.getWidth(); x += 300) {
                for (int y = 0; y < image.getHeight(); y += 150) {
                    graphics.drawString("SECURED: " + clientId, font, brush, x, y);
                }
            }

            // 3. Setup XMP Metadata
            XmpPacketWrapper xmpData = new XmpPacketWrapper();
            XmpPackage meitySchema = new XmpPackage("meity", "http://india.meity.gov.in/rules2026/");

            // Aspose uses setProperty for custom tags
            meitySchema.set_Item("meity:isSynthetic", "true");
            meitySchema.set_Item("meity:originPlatform", "AI-Shield-India");
            meitySchema.set_Item("meity:certifiedBy", clientId);

            xmpData.addPackage(meitySchema);

            // 5. Inject metadata and save
            image.setXmpData(xmpData);
            image.save();

            // Manifest output for Node.js
            System.out.println("<certified_manifest>");
            System.out.println("  <status>COMPLIANT</status>");
            System.out.println("  <info>Metadata and Watermark Injected Successfully</info>");
            System.out.println("</certified_manifest>");

        } catch (Exception e) {
            System.err.println("Injection Failed: " + e.getMessage());
        }
    }
}