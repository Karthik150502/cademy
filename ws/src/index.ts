import { WebSocket, WebSocketServer } from "ws";
import { User } from "./controllers/user";
const wss = new WebSocketServer({
    port: 8001
})
wss.on("connection", (ws: WebSocket, req: Request) => {
    const urlParams = new URLSearchParams(req.url.split('?')[1]);
    const userId = urlParams.get('userId');
    const user: User = new User(ws, userId!);
    console.log(`User connected on....${user.id}`);
    ws.on("error", (error) => {
        console.log("Error connecting to the Websocket connection.");
        console.error(error);
    });
    ws.onclose = async () => {
        console.log("User disconnected....", user.id!);
        await user.destroy();
    }
})
