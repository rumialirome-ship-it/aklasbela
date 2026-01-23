
import { useState, useEffect, useCallback } from 'react';

export const useCountdown = (drawTime: string) => {
    const OPEN_HOUR = 16; // 4:00 PM
    const PKT_OFFSET = 5 * 60; // Minutes

    const [display, setDisplay] = useState<{status: 'LOADING' | 'SOON' | 'OPEN' | 'CLOSED', text: string}>({ status: 'LOADING', text: '...' });

    const getCycle = useCallback(() => {
        const now = new Date();
        // Convert local/UTC to PKT
        const nowPKT = new Date(now.getTime() + (now.getTimezoneOffset() + PKT_OFFSET) * 60000);
        
        const [drawH, drawM] = drawTime.split(':').map(Number);
        
        // Draw time PKT
        let closePKT = new Date(nowPKT);
        closePKT.setHours(drawH, drawM, 0, 0);

        let openPKT = new Date(closePKT);
        if (drawH < OPEN_HOUR) {
            // Draw is early morning (e.g. 02:10 AM) - Belongs to cycle opening yesterday 4PM
            openPKT.setDate(openPKT.getDate() - 1);
            openPKT.setHours(OPEN_HOUR, 0, 0, 0);
        } else {
            // Draw is evening - Belongs to cycle opening today 4PM
            openPKT.setHours(OPEN_HOUR, 0, 0, 0);
        }

        // Convert PKT points back to standard Date objects (approximate for diffing)
        const openTime = new Date(now.getTime() + (openPKT.getTime() - nowPKT.getTime()));
        const closeTime = new Date(now.getTime() + (closePKT.getTime() - nowPKT.getTime()));
        
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
                setDisplay({ status: 'SOON', text: formatTime12h(openTime) });
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
