# Backup, object storage, and rollback — practical checklist

**Scope:** lightweight practices appropriate for a serious internal beta, without enterprise over-engineering. No new infrastructure is required beyond what you already use (e.g. Atlas, S3, Vercel, Railway).

## MongoDB (Atlas)

- **Backups:** In Atlas, confirm **Cloud Backup** (M10+ continuous) or **snapshot** schedule (M0/M2/M5) is enabled for the cluster that holds UAT and/or production, per cluster.
- **Restore test:** Once per release cycle, in a **non-production** cluster, perform a test restore of a snapshot into a throwaway database or project to ensure you can recover (document who did it and the date).
- **Access:** Restrict database users with least privilege; separate users for UAT vs production.

## S3 (or compatible object storage)

- **Versioning:** On buckets that store customer or tenant files, **enable versioning** if your product overwrites objects in place, so you can recover from bad deploys or bugs.
- **Lifecycle:** Add lifecycle rules to expire **old versions** after N days to control cost, once you agree on retention.
- **Bucket policy:** No public `ListBucket` on private data; use CloudFront or signed URLs if you expose files.

## Secrets

- **Never** commit `.env` files with real secrets. Use host-provided env (Vercel, Railway) or a secrets manager.
- **Rotation:** If a secret leaks, rotate `JWT_SECRET`, API keys, and third-party DSNs; redeploy.
- **Production vs UAT:** Use different values everywhere (see [UAT_DEV_ENVIRONMENT.md](./UAT_DEV_ENVIRONMENT.md)).

## Rollback (deployment mistakes)

| Layer | Rollback action |
|-------|-----------------|
| **Vercel (client)** | Redeploy a **previous production deployment** from the Vercel dashboard (instant rollback to last known good). |
| **Railway (API)** | Redeploy an earlier **commit** or **image**; keep one-click “previous” tagged if your team uses that workflow. |
| **Database** | Prefer **forward fixes**; if you must roll back data, restore from the latest **snapshot** to a new database and repoint the app (maintenance window, documented). |
| **Feature flags** | If you add flags, toggling off bad behavior is often faster than a full redeploy. |

## Readiness one-pager (before “serious” internal use)

- [ ] Atlas backup/snapshot is on for the relevant cluster; last restore test recorded.
- [ ] S3 versioning decision recorded for at least the primary private bucket.
- [ ] No production secrets in repo; UAT and prod are isolated.
- [ ] On-call or owner knows: how to **rollback** Vercel and Railway, and who can **restore** Mongo from Atlas.

## Related

- Production topology: [ARIVU_PRODUCTION_DEPLOYMENT.md](./ARIVU_PRODUCTION_DEPLOYMENT.md)  
- UAT isolation: [UAT_DEV_ENVIRONMENT.md](./UAT_DEV_ENVIRONMENT.md)  
