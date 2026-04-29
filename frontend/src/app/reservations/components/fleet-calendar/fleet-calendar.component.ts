import { Component, OnInit, Input, OnChanges, SimpleChanges } from '@angular/core';

interface CalendarEvent {
    id: number;
    title: string;
    start: Date;
    end: Date;
    status: string;
    mission: string;
    employee: string;
    vehicle: string;
    backgroundColor: string;
    borderColor: string;
    textColor: string;
}

@Component({
    selector: 'app-fleet-calendar',
    templateUrl: './fleet-calendar.component.html',
    styleUrls: ['./fleet-calendar.component.css']
})
export class FleetCalendarComponent implements OnInit, OnChanges {
    @Input() events: any[] = [];

    weekDays: Date[] = [];
    hours: number[] = [];

    formattedEvents: CalendarEvent[] = [];

    currentDate: Date = new Date();
    weekRangeText: string = '';

    constructor() {
        // 6 AM to 6 PM (18:00)
        for (let i = 6; i <= 18; i++) {
            this.hours.push(i);
        }
    }

    ngOnInit(): void {
        this.generateWeekDays();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['events']) {
            this.processEvents();
        }
    }

    generateWeekDays(): void {
        const curr = new Date(this.currentDate);
        const day = curr.getDay();
        const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(curr.setDate(diff));
        monday.setHours(0, 0, 0, 0);

        this.weekDays = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            this.weekDays.push(d);
        }

        const first = this.weekDays[0];
        const last = this.weekDays[6];
        this.weekRangeText = `${first.getDate()} ${this.getMonthName(first)} - ${last.getDate()} ${this.getMonthName(last)} ${last.getFullYear()}`;
    }

    processEvents(): void {
        this.formattedEvents = (this.events || []).map(e => ({
            ...e,
            start: new Date(e.start),
            end: new Date(e.end)
        }));
    }

    /**
     * Returns events that happen on this day (overlap)
     */
    getEventsForDay(day: Date): CalendarEvent[] {
        const startOfDay = new Date(day);
        startOfDay.setHours(6, 0, 0, 0);
        const endOfDay = new Date(day);
        endOfDay.setHours(18, 59, 59, 999);

        return this.formattedEvents.filter(e => {
            return (e.start <= endOfDay && e.end >= startOfDay);
        });
    }

    getEventStyle(event: CalendarEvent, currentDay: Date) {
        const startOfDay = new Date(currentDay);
        startOfDay.setHours(6, 0, 0, 0);
        const endOfDay = new Date(currentDay);
        endOfDay.setHours(18, 59, 59, 999);

        // Dynamic start/end for the visual block on THIS day
        const displayStart = event.start < startOfDay ? startOfDay : event.start;
        const displayEnd = event.end > endOfDay ? endOfDay : event.end;

        const startHour = displayStart.getHours() + (displayStart.getMinutes() / 60);
        const endHour = displayEnd.getHours() + (displayEnd.getMinutes() / 60);

        const duration = endHour - startHour;

        // Each hour is 45px high
        const top = (startHour - 6) * 45;
        const height = Math.max(duration * 45, 20); // Min height 20px for tiny events

        return {
            'top.px': top,
            'height.px': height,
            'background-color': event.backgroundColor,
            'border-left': `4px solid ${event.borderColor}`,
            'color': event.textColor,
            'opacity': event.status === 'cancelled' || event.status === 'rejected' ? 0.6 : 1
        };
    }

    prevWeek(): void {
        this.currentDate.setDate(this.currentDate.getDate() - 7);
        this.generateWeekDays();
    }

    nextWeek(): void {
        this.currentDate.setDate(this.currentDate.getDate() + 7);
        this.generateWeekDays();
    }

    today(): void {
        this.currentDate = new Date();
        this.generateWeekDays();
    }

    private getMonthName(date: Date): string {
        return date.toLocaleString('default', { month: 'short' });
    }

    getStatusLabel(status: string): string {
        switch (status) {
            case 'pending': return 'En attente';
            case 'approved': return 'Approuvée';
            case 'in_progress': return 'En cours';
            case 'completed': return 'Terminée';
            case 'rejected': return 'Refusée';
            case 'cancelled': return 'Annulée';
            default: return status;
        }
    }

    /**
     * Stats Helpers for Sidebar
     */
    get weekEvents(): CalendarEvent[] {
        if (!this.weekDays.length) return [];
        const startOfWeek = this.weekDays[0];
        const endOfWeek = new Date(this.weekDays[6]);
        endOfWeek.setHours(23, 59, 59, 999);

        return this.formattedEvents.filter(e => {
            return (e.start <= endOfWeek && e.end >= startOfWeek);
        });
    }

    get weekEventsCount(): number {
        return this.weekEvents.length;
    }

    getCount(status: string): number {
        return this.weekEvents.filter(e => e.status === status).length;
    }

    getPercent(status: string): number {
        if (!this.weekEventsCount) return 0;
        return (this.getCount(status) / this.weekEventsCount) * 100;
    }

    isToday(day: Date): boolean {
        return day.toDateString() === new Date().toDateString();
    }
}
