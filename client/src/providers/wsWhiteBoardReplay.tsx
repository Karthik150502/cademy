'use client'
import React, { useContext, useEffect, useState } from 'react'
import { useSession } from 'next-auth/react';

type WsProps = {
    socket: WebSocket | null
}

export const WsContext = React.createContext<WsProps | null>(null);

export default function WsWhiteBoardReplay({ children }: { children: React.ReactNode }) {

    const { data } = useSession();
    const [socket, setSocket] = useState<WebSocket | null>(null);
    useEffect(() => {
        const state = new WebSocket(`wss//ws-cademy.decimalight.in?userId=${data?.user?.id}`);
        setSocket(state);
        return () => {
            state.close();
            setSocket(null);
        }
    }, [data?.user?.id])

    return (
        <WsContext.Provider value={{ socket }}>
            {children}
        </WsContext.Provider>
    )
}



export function useWSWhiteboardReplay() {
    const state = useContext(WsContext);
    const [ws, setWs] = useState<WsProps | null>(null);

    useEffect(() => {
        if (state) {
            setWs(state)
        }
    }, [state])

    return ws;
}