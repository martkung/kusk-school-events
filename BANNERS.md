# School publicity banners

Admin: จัดการระบบ > ประชาสัมพันธ์. This is independent of event registration and works without selecting/creating an event. Google Admin and explicitly approved LINE Admin use the same permission checks.

Create/edit title, main image, optional mobile image, optional HTTPS/internal hash link, display order and visibility. Recommended main image: 1800×650; mobile: 960×540. JPG/PNG/WebP inputs up to 15 MB are decoded, resized without cropping and converted to JPEG up to 1920×1080 and 2 MB. No image data is embedded in Firestore.

Images are public promotional materials under Storage schoolEventBanners/{bannerId}/{uuid}.jpg. Only Admin uploads/deletes; MIME and size limits apply to the namespace and cannot be bypassed via legacy catchall rules. Draft metadata is private to Admin. Deleting a banner removes its Firestore record and public placement; uploaded media files are retained, including prior versions, rather than risking deletion of files still being used by a concurrent edit. This is not a private document upload area.

schoolEventBanners holds curated records; clients cannot write them directly. schoolEventBannerMeta/main is private server-side count metadata with a 20-record cap (including hidden banners). Server operations saveBanner/deleteBanner use transactions and expectedVersion to prevent lost edits; each mutation writes a schoolEventAudit record with eventId __banners__. No applicant records are read or changed.

Homepage carousel subscribes only to published records, orders by sortOrder/id and updates in real time. Auto-rotation: 5 seconds, manual arrows/dots, pause/resume, horizontal touch swipe. Hover/focus/hidden tabs pause rotation; reduced-motion preference starts paused. Manual navigation stops rotation until explicitly resumed. Horizontal swipes suppress accidental link activation. HTTPS links open in a new tab with noopener/noreferrer. No published records means no banner gap on the homepage.

Two editable school-service banners can be initialized once with firebase/seed-banners.cjs. The script never overwrites an existing collection or count document, and does not access applicant data. Their original vector artwork is bundled under dist/banners; Admin may replace it with uploaded images, change links, hide or delete it.

Validation: server CRUD, cap, privilege checks and stale concurrent edit tests; DOM tests for Admin changes, image preservation, callbacks/disposal, slideshow rotation, live updates, links, reduced motion and mobile gestures; Cloud Rules synthetic evaluation. Physical mobile file upload and camera/browser behavior remain owner acceptance tests.
