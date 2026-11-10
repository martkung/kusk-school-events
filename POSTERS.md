# Poster uploads — prepared

Optional image selection/preview on creation; replacement in event settings. Client re-encodes JPEG, preserves ratio, maximum 1200x1600 dimensions, 2 MB output and 15 MB source. The new schoolEventPosters prefix permits admin-only writes and public poster reads; legacy authenticated access outside the prefix is unchanged. Original Storage rules backed up locally in ignored firebase/audit.

Each upload uses a new filename to prevent stale caches and preserve the previous poster. Catalog URL is updated via an admin-only callable, constrained to this bucket/event prefix, with an audit record. A failed catalog update can leave an orphan upload; no historical images are automatically deleted. New-event retry retains the event ID to avoid duplicate creation when poster upload fails.

Requires deployment of Storage rules and schoolEventOperate before web rollout. Browser image processing/upload, CORS and mobile picker require end-to-end QA. No user image has been uploaded during automated tests.
