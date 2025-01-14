import { MeetingManager, User, Player } from "./index";
import WebSocket from "ws";
import { IncomingData, IncomingEvents, IncomingMessageType, OutgoingEvents } from "../types";
export class WsHandler {


    constructor(private user: User, private ws: WebSocket) {
        this.user = user;
        this.ws = ws;
        this.initialize();
    }
    public broadcast(meetingId: string, jsonString: string) {
        let meetingInfo = MeetingManager.getMeeting(meetingId)!;
        if (!meetingInfo) {
            return;
        }
        const userId = this.user.id!;
        Object.entries(meetingInfo.members).forEach(([peerId, peer]: [string, User]) => {
            if (userId !== peerId) {
                peer.sendMessage(jsonString);
            }
        })
    }
    public emitToAll(meetingId: string, jsonString: string) {
        let meetingInfo = MeetingManager.getMeeting(meetingId)!
        if (!meetingInfo) {
            return;
        }

        Object.entries(meetingInfo.members).forEach(([_, peer]: [string, User]) => {
            peer.sendMessage(jsonString);
        })
    }


    public sendMessage(jsonString: string) {
        this.ws.send(jsonString);
    }


    public async closeWs() {
        this.ws.close();
    }

    public initialize() {
        this.ws.onmessage = async (message) => {
            let parsed: IncomingMessageType<IncomingData>;
            try {
                parsed = JSON.parse(message.data.toString());
            } catch {
                console.log("Malformed JSON.");
                return;
            }

            switch (parsed.type) {
                case IncomingEvents.JOIN_MEETING: {
                    let usrId = parsed.data.userId;
                    this.user.setUserId(usrId);
                    console.log("User joined... = ", usrId);
                    MeetingManager.addUser(parsed.data.meetingId, this.user);
                    const meeting = MeetingManager.getMeeting(this.user.meetingId!);
                    console.log("initialStrokes = ", meeting?.whiteBoardState);
                    this.sendMessage(JSON.stringify({
                        type: OutgoingEvents.USER_JOINED,
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
                    MeetingManager.updateWhiteboard(parsed.data.stroke, this.user.meetingId!);
                    this.broadcast(this.user.meetingId!, JSON.stringify({
                        type: OutgoingEvents.STROKE_INPUT,
                        stroke: parsed.data.stroke
                    }))
                    break;
                }
                case IncomingEvents.START_RECORDING: {
                    await MeetingManager.startRecording(this.user.meetingId!, parsed.data.initialStrokes);
                    MeetingManager.broadcast(this.user.id!, this.user.meetingId!, JSON.stringify({
                        type: OutgoingEvents.RECORDING_STARTED,
                        data: {
                            startedBy: this.user.id!
                        }
                    }));
                    break;
                }
                case IncomingEvents.STOP_RECORDING: {
                    console.log("Recording stopped");
                    await MeetingManager.stopRecording(this.user.meetingId!);
                    MeetingManager.broadcast(this.user.id!, this.user.meetingId!, JSON.stringify({
                        type: OutgoingEvents.RECORDING_STOPPED,
                        data: {
                            startedBy: this.user.id!
                        }
                    }));
                    break;
                }
                case IncomingEvents.PLAY_RECORDING: {
                    const recordingId = parsed.data.recordingId;
                    console.log(`Replaying the strokes for whiteboard-${recordingId}`);
                    const recording = await this.user.getRecordingStartingTime(recordingId);
                    if (!recording) {
                        return;
                    }

                    const { createdAt, initialState, subsequentStates } = recording;
                    this.sendMessage(JSON.stringify({
                        type: "replay-initialstate",
                        payload: {
                            initialState,
                            subsequentStates,
                            createdAt
                        }
                    }))
                    break;
                }

                default: {

                    break;
                }
            }
        }
    }


}