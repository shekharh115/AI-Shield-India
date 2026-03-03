package com.aishield;

import com.aspose.imaging.Image;
import com.aspose.imaging.xmp.XmpPacketWrapper;
import com.aspose.imaging.xmp.XmpPackage;

public class ComplianceSigner {
    public static void main(String[] args) {
        // 1. Guard against empty arguments
        if (args.length < 2) {
            System.err.println("Usage: java -jar shield.jar <imagePath> <clientId>");
            return;
        }

        // 2. Define variables INSIDE the main method
        String imagePath = args[0];
        String clientId = args[1];

        // 3. Start the processing logic
        try (Image image = Image.load(imagePath)) {
            XmpPacketWrapper xmpData = new XmpPacketWrapper();

            // MeitY 2026 Legal Schema
            XmpPackage meitySchema = new XmpPackage("meity", "http://india.meity.gov.in/rules2026/");

            // Aspose uses setProperty for custom tags
            meitySchema.set_Item("meity:isSynthetic", "true");
            meitySchema.set_Item("meity:originPlatform", "AI-Shield-India");
            meitySchema.set_Item("meity:certifiedBy", clientId);

            xmpData.addPackage(meitySchema);

            // Inject and save metadata directly to the file
            image.setXmpData(xmpData);
            image.save();

            // Manifest output for Node.js
            System.out.println("<certified_manifest>");
            System.out.println("  <status>COMPLIANT</status>");
            System.out.println("  <info>Metadata Injected Successfully</info>");
            System.out.println("</certified_manifest>");

        } catch (Exception e) {
            System.err.println("Injection Failed: " + e.getMessage());
        }
    }
}