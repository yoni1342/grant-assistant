import { makeListRoute } from "@/lib/api/list-route"

export const runtime = "nodejs"

export const GET = makeListRoute("activity", "activity:read")
