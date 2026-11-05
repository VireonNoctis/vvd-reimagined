# Private Media Storage

The Gallery is backed by private S3-compatible object storage. The API never accepts an object key from the browser: it generates a random asset ID and object key, stores the association with a world/account, and signs a five-minute PUT URL.

## Enable it

Set `VVD_S3_BUCKET` and `VVD_S3_REGION` on the Rust API. Both are required. Credentials come from the AWS SDK's normal provider chain (for example, workload identity or environment credentials). For a compatible endpoint, set `VVD_S3_ENDPOINT`; set `VVD_S3_FORCE_PATH_STYLE=true` for providers that require path-style bucket URLs. Production custom endpoints must use HTTPS.

Do not make the bucket public. Keep public access blocked and configure default server-side encryption. Grant the API identity only the object-level permissions it needs for the Gallery prefix: `s3:PutObject`, `s3:GetObject` and `s3:DeleteObject`. Limit the bucket policy to the API role and expected prefix.

## Browser CORS

Allow the exact application origin, the `PUT` method and the `Content-Type` request header. A minimal AWS S3 CORS rule looks like:

```json
[
  {
    "AllowedOrigins": ["https://your-app.example"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 300
  }
]
```

Use `http://localhost:3000` only in a local development bucket's CORS rule. Do not add wildcard origins to a production bucket.

## Upload lifecycle

1. The signed-in member requests an upload ticket for an allowlisted content type and bounded size.
2. The API creates a pending metadata row and returns a five-minute presigned PUT with the expected Content-Type header.
3. The browser sends the file directly to object storage.
4. The browser asks the API to complete the upload. The API uses HeadObject to compare stored byte length and declared content type before the asset becomes visible to world members.
5. Downloads require world membership and redirect to a five-minute presigned GET. Deletes require a writer role and remove the object before marking its metadata deleted.

Images are limited to 50 MB, audio to 60 MB and video to 250 MB. SVG and other active-content types are excluded. The current verification checks object metadata, not file bytes; it is not malware scanning and cannot prove that the bytes match the declared MIME type. Add a scanning/quarantine stage before accepting untrusted public uploads. Pending uploads that are never completed need a scheduled cleanup or storage lifecycle policy; that worker is not included yet.
