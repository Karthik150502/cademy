import { User } from "./user";
import { MeetingManager } from "./meetingManager";
import WebSocket from "ws";
import { IncomingData, IncomingEvents, IncomingMessageType } from "../types";
export class WsHandler {
    constructor(private user: User, private ws: WebSocket) {
        this.user = user;
        this.ws = ws;
        this.initialize();
    }
    public broadcast(meetingId: string, jsonString: string) {
        let meetingInfo = MeetingManager.getMeeting(meetingId)!
        if (!meetingInfo) {
            return;
        }
        const userId = this.user.id!;
        Object.entries(meetingInfo.members).forEach(([peerId, peer]: [string, User]) => {
            console.log("userid, Id", userId, peerId)
            if (userId !== peerId) {
                peer.sendMessage(jsonString)
            }
        })
    }
    public emitToAll(meetingId: string, jsonString: string) {
        let meetingInfo = MeetingManager.getMeeting(meetingId)!
        if (!meetingInfo) {
            return;
        }

        Object.entries(meetingInfo.members).forEach(([_, peer]: [string, User]) => {
            peer.sendMessage(jsonString)
        })
    }


    public sendMessage(jsonString: string) {
        this.ws.send(jsonString);
    }


    public closeWs() {
        this.ws.close();
    }


    public initialize() {
        this.ws.onmessage = async (message) => {
            let parsed: IncomingMessageType<IncomingData>;
            try {
                parsed = JSON.parse(message.data.toString());
            } catch {
                console.log("Malformed JSON.")
                return;
            }

            switch (parsed.type) {
                case IncomingEvents.JOIN_MEETING: {
                    let usrId = parsed.data.userId;
                    this.user.setUserId(usrId);
                    console.log("User joined... = ", usrId);
                    MeetingManager.addUser(parsed.data.meetingId, this.user);
                    const meeting = MeetingManager.getMeeting(this.user.getMeetingId()!);
                    console.log("initialStrokes = ", meeting?.whiteBoardState);
                    this.sendMessage(JSON.stringify({
                        type: "user-joined",
                        strokes: meeting?.whiteBoardState || []
                    }))
                    break;
                }
                case IncomingEvents.LEAVE_MEETING: {
                    // TODO: End the meeting for other users if the organisers leaves the meeting.
                    this.closeWs();
                    break;
                }
                case IncomingEvents.SHOW_MEETINGS: {
                    MeetingManager.getMeetingDetails();
                    break;
                }
                case IncomingEvents.STROKE_INPUT: {
                    MeetingManager.updateWhiteboard(this.user.id!, parsed.data.stroke, this.user.getMeetingId()!);
                    break;
                }
                case IncomingEvents.START_RECORDING: {
                    await MeetingManager.startRecording(this.user.getMeetingId()!, parsed.data.initialStrokes);
                    MeetingManager.broadcast(this.user.id!, this.user.getMeetingId()!, JSON.stringify({
                        type: "recording-started",
                        data: {
                            startedBy: this.user.id!
                        }
                    }));
                    break;
                }
                case IncomingEvents.STOP_RECORDING: {
                    console.log("Recording stopped");
                    await MeetingManager.stopRecording(this.user.getMeetingId()!);
                    MeetingManager.broadcast(this.user.id!, this.user.getMeetingId()!, JSON.stringify({
                        type: "recording-stopped",
                        data: {
                            startedBy: this.user.id!
                        }
                    }));
                    break;
                }

                default: {

                    break;
                }
            }
        }
    }


}