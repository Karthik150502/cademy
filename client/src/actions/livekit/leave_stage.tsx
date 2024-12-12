'use server'
import { cookies } from "next/headers";
import { Api } from "@/lib/api";
import axios from "axios";
export async function leaveStage({
    identity
}: {
    identity: string
}) {
    const access_token = cookies().get("access_token")?.value;
    const res = await axios.post(`${Api.BACKEND_URL}/api/v1/livekit/remove_from_stage`, {
        identity: identity,
    },
        {
            headers: { "Content-Type": "application/json", "authorization": `Bearer ${access_token}` }
        });

} 