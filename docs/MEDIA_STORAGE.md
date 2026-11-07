# Private Media Storage

The Gallery is backed by private S3-compatible object storage. The API never accepts an object key from the browser: it generates a random asset ID and object key, stores the association with a world/account, and signs a five-minute PUT URL.

## Enable it

Set `VVD_S3_BUCKET`, `VVD_S3_REGION` and `VVD_CLAMAV_ADDRESS` on the Rust API. Set `VVD_CSP_CONNECT_ORIGINS` in the Next.js environment to the exact HTTPS origin used by the presigned PUT URL; this is a separate frontend setting. The scanner address is a private `host:port` reachable only from the API network (for example, a sidecar service on an internal container network). ClamAV's TCP protocol is not authenticated or encrypted; never expose the daemon to the public internet. Both are required. Credentials come from the AWS SDK's normal provider chain (for example, workload identity or environment credentials). For a compatible endpoint, set `VVD_S3_ENDPOINT`; set `VVD_S3_FORCE_PATH_STYLE=true` for providers that require path-style bucket URLs. Production custom endpoints must use HTTPS.

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
4. The browser asks the API to complete the upload. The API uses HeadObject to compare stored byte length and declared content type, then streams the private pending object through ClamAV's `zINSTREAM` protocol. Only a clean result makes the asset visible to world members. Infected objects are rejected and deleted; scanner errors/timeouts leave the object pending and unavailable.
5. Downloads require world membership and redirect to a five-minute presigned GET. Deletes require a writer role and remove the object before marking its metadata deleted. A ready asset can be attached to one canonical card in the same world; the card inspector can attach or detach an existing Gallery item without copying the object. An attached item cannot be deleted until it is detached from its card.

Images are limited to 50 MB, audio to 60 MB and video to 250 MB. SVG and other active-content types are excluded. Byte-level malware scanning is integrated but requires an operator-managed ClamAV daemon. Configure `StreamMaxLength` above 250 MB, keep virus definitions current and isolate the scanner on a private network. The daemon is not provisioned by this repository. Pending uploads that are never completed need a scheduled cleanup or storage lifecycle policy; that worker is not included yet. Attachments are canonical card metadata, not era-specific overrides. Image attachments render inline in the card reader; audio and video are available as private downloads from the inspector.
