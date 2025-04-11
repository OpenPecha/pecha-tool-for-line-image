import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Generate a unique filename
    const fileExtension = file.name.split(".").pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    const folderPath = "Marieke/Normalisation/images";
    const s3Key = `${folderPath}/${fileName}`;

    // Upload to S3
    const params = {
      Bucket: bucketName,
      Key: s3Key,
      Body: buffer,
      ContentType: file.type,
    };

    const response = await s3Client.send(new PutObjectCommand(params));
    console.log("Upload response:", response);

    // Generate the S3 URL using the virtual-hosted style URL format
    const s3Url = `https://s3.${process.env.AWS_REGION}.amazonaws.com/${process.env.AWS_S3_BUCKET_NAME}/${s3Key}`;

    return NextResponse.json({ success: true, url: s3Url });
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    return NextResponse.json(
      { error: "Error uploading file" },
      { status: 500 }
    );
  }
}
