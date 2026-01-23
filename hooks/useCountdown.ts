
import { useState, useEffect, useCallback } from 'react';

export const useCountdown = (drawTime: string) => {
    const OPEN_HOUR = 16; // 4:00 PM
    const PKT_OFFSET = 5 * 60; // Minutes

    const [display, setDisplay] = useState<{status: 'LOADING' | 'SOON' | 'OPEN' | 'CLOSED', text: string}>({ status: 'LOADING', text: '...' });

    const getCycle = useCallback(() => {
        if (!drawTime) return { openTime: new Date(0), closeTime: new Date(0) };

        const now = new Date();
        // Convert user's local time -> UTC -> PKT
        const nowPKT = new Date(now.getTime() + (now.getTimezoneOffset() + PKT_OFFSET) * 60000);
        
        const [drawH, drawM] = drawTime.split(':').map(Number);
        
        // 1. Determine cycle start (Current 4 PM context)
        let openPKT = new Date(nowPKT);
        openPKT.setHours(16, 0, 0, 0);
        if (nowPKT.getHours() < 16) {
            openPKT.setDate(openPKT.getDate() - 1);
        }

        // 2. Determine draw close relative to that start
        let closePKT = new Date(openPKT);
        closePKT.setHours(drawH, drawM, 0, 0);
        if (drawH < 16) {
            closePKT.setDate(closePKT.getDate() + 1);
        }

        // Convert PKT date context back to user's Local context for comparison
        const diffOpen = openPKT.getTime() - nowPKT.getTime();
        const diffClose = closePKT.getTime() - nowPKT.getTime();

        const openTime = new Date(now.getTime() + diffOpen);
        const closeTime = new Date(now.getTime() + diffClose);
        
        return { openTime, closeTime };
    }, [drawTime]);

    useEffect(() => {
        const formatTime12h = (date: Date) => {
            let hours = date.getHours();
            const minutes = date.getMinutes();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours || 12;
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${ampm}`;
        };

        const timer = setInterval(() => {
            const now = new Date();
            const { openTime, closeTime } = getCycle();
            
            if (now < openTime) {
                setDisplay({ status: 'SOON', text: `Starts @ ${formatTime12h(openTime)}` });
            } else if (now >= openTime && now < closeTime) {
                const distance = closeTime.getTime() - now.getTime();
                const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((distance % (1000 * 60)) / 1000);
                setDisplay({
                    status: 'OPEN',
                    text: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
                });
            } else {
                setDisplay({ status: 'CLOSED', text: 'MARKET CLOSED' });
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [getCycle]);

    return display;
};
