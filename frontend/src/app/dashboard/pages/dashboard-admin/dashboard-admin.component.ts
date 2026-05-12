import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import Chart from 'chart.js/auto';
import { DashboardService } from '../../../core/services/dashboard.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { AdminDashboard } from '../../../shared/models/dashboard';
import { Employee } from '../../../shared/models/employee';
import { CompanySettingService, CompanySetting } from '../../../core/services/company-setting.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/services/auth.service';
import * as L from 'leaflet';

@Component({
  selector: 'app-dashboard-admin',
  templateUrl: './dashboard-admin.component.html',
  styleUrls: ['./dashboard-admin.component.css']
})
export class DashboardAdminComponent implements OnInit, AfterViewInit {
  dashboardData: AdminDashboard | null = null;
  employees: Employee[] = [];
  loading: boolean = true;
  error: string = '';

  // Calendar data
  currentDate = new Date();
  calendarDays: number[] = [];
  currentMonthStr: string = '';
  reservedDates: Set<number> = new Set();

  // 📊 Charts
  @ViewChild('reservationsChart') reservationsChartRef!: ElementRef;
  @ViewChild('vehiclesChart') vehiclesChartRef!: ElementRef;
  @ViewChild('weeklyTrendChart') weeklyTrendChartRef!: ElementRef;

  reservationsChart: any = null;
  vehiclesChart: any = null;
  weeklyTrendChart: any = null;

  // 🗺️ Heatmap
  @ViewChild('heatmapMap') heatmapMapRef!: ElementRef;
  private heatmapMap: L.Map | null = null;

  // 🏢 Company Parking Config
  showParkingModal = false;
  parkingSettings: CompanySetting = { parking_lat: 36.8065, parking_lng: 10.1815, parking_address: '' };
  @ViewChild('parkingMapContainer') parkingMapContainer!: ElementRef;
  private parkingMap: L.Map | null = null;
  private parkingMarker: L.Marker | null = null;
  searchAddress = '';
  isSearchingAddress = false;

  constructor(
    private dashboardService: DashboardService,
    private employeeService: EmployeeService,
    private companySettingService: CompanySettingService,
    private toastService: ToastService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.loadDashboard();
    this.loadEmployees();
    this.initCalendar();
    this.loadParkingSettings();
  }

  get isAdminOnly(): boolean {
    return this.authService.isAdmin();
  }

  ngAfterViewInit(): void {
    // Charts will be initialized after data loads
  }

  loadDashboard(): void {
    this.loading = true;
    this.dashboardService.getAdminDashboard().subscribe({
      next: (data: AdminDashboard) => {
        this.dashboardData = data;
        this.loading = false;

        // Highlight approved reservations in calendar
        this.reservedDates.clear();
        if (data.approved_reservations_dates) {
          data.approved_reservations_dates.forEach((res: any) => {
            const d = new Date(res.date);
            if (d.getMonth() === this.currentDate.getMonth()) {
              this.reservedDates.add(d.getDate());
            }
          });
        }

        setTimeout(() => {
          this.initCharts();
          this.initWeeklyTrendChart();
          this.initHeatmapMap();
        }, 200);
      },
      error: (err: any) => {
        this.error = 'Erreur: ' + (err.error?.message || err.message || 'Erreur lors du chargement du dashboard');
        this.loading = false;
        console.error('Dashboard error:', err);
      }
    });
  }

  loadEmployees(): void {
    this.employeeService.getAll().subscribe({
      next: (data: Employee[]) => {
        this.employees = data.slice(0, 5);
      },
      error: (err: any) => console.error('Error loading employees', err)
    });
  }

  initCalendar(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    this.currentMonthStr = new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' }).format(this.currentDate);

    const daysInMonth = new Date(year, month + 1, 0).getDate();
    this.calendarDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }

  private initCharts(): void {
    if (!this.dashboardData) return;

    this.initReservationsChart();
    this.initVehiclesChart();
  }

  private initReservationsChart(): void {
    if (!this.reservationsChartRef) return;

    const ctx = this.reservationsChartRef.nativeElement.getContext('2d');
    const chartData = this.dashboardData?.charts.reservations_by_month || [];

    if (this.reservationsChart) this.reservationsChart.destroy();

    // 🎨 Modern Gradient for Bars
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(99, 102, 241, 1)');   // Indigo 500
    gradient.addColorStop(1, 'rgba(168, 85, 247, 0.8)'); // Purple 500

    this.reservationsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: chartData.map(d => d.month),
        datasets: [{
          label: 'Réservations',
          data: chartData.map(d => d.count),
          backgroundColor: gradient,
          hoverBackgroundColor: 'rgba(79, 70, 229, 1)', // Indigo 600
          borderRadius: 6,
          borderSkipped: false,
          barThickness: 28, // Modern thin bars
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Réservations par mois',
            font: { size: 16, weight: 'bold', family: "'Inter', sans-serif" },
            color: '#1e293b',
            padding: { bottom: 20 }
          },
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1e293b',
            padding: 12,
            titleFont: { size: 13, family: "'Inter', sans-serif" },
            bodyFont: { size: 14, weight: 'bold', family: "'Inter', sans-serif" },
            displayColors: false,
            callbacks: {
              label: (context: any) => `${context.parsed.y} réservation(s)`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false, drawBorder: false },
            ticks: { font: { family: "'Inter', sans-serif" }, color: '#64748b' }
          },
          y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9', tickLength: 0, drawBorder: false },
            ticks: {
              stepSize: 1,
              font: { family: "'Inter', sans-serif" },
              color: '#64748b',
              padding: 10
            }
          }
        }
      }
    });
  }

  private initWeeklyTrendChart(): void {
    if (!this.weeklyTrendChartRef || !this.dashboardData) return;

    const ctx = this.weeklyTrendChartRef.nativeElement.getContext('2d');
    const current = this.dashboardData.charts.reservations_last_7_days || [];
    const previous = this.dashboardData.charts.reservations_previous_7_days || [];

    if (this.weeklyTrendChart) this.weeklyTrendChart.destroy();

    const labels = current.map((d: any) => d.day);

    // 🎨 Gradient for the line area
    const gradientCurrent = ctx.createLinearGradient(0, 0, 0, 300);
    gradientCurrent.addColorStop(0, 'rgba(79, 70, 229, 0.2)');
    gradientCurrent.addColorStop(1, 'rgba(79, 70, 229, 0)');

    this.weeklyTrendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Cette semaine',
            data: current.map((d: any) => d.count),
            borderColor: 'rgba(79, 70, 229, 1)',
            backgroundColor: gradientCurrent,
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: '#ffffff',
            pointBorderColor: 'rgba(79, 70, 229, 1)',
            pointBorderWidth: 2,
            pointHoverRadius: 6,
          },
          {
            label: 'Semaine dernière',
            data: previous.map((d: any) => d.count),
            borderColor: 'rgba(148, 163, 184, 1)',
            backgroundColor: 'transparent',
            fill: false,
            tension: 0.4,
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            pointHoverRadius: 4,
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          title: { display: false }, // Hidden since we have HTML title
          legend: {
            position: 'top',
            align: 'end',
            labels: { usePointStyle: true, padding: 15, font: { family: "'Inter', sans-serif", size: 12 } }
          },
          tooltip: {
            backgroundColor: '#1e293b',
            padding: 12,
            titleFont: { size: 13, family: "'Inter', sans-serif" },
            bodyFont: { size: 13, family: "'Inter', sans-serif" },
            usePointStyle: true,
          }
        },
        scales: {
          x: {
            grid: { display: false, drawBorder: false },
            ticks: { font: { family: "'Inter', sans-serif" }, color: '#64748b' }
          },
          y: {
            beginAtZero: true,
            grid: { color: '#f1f5f9', drawBorder: false },
            ticks: { stepSize: 1, font: { family: "'Inter', sans-serif" }, color: '#64748b' }
          }
        }
      }
    });
  }

  private initHeatmapMap(): void {
    if (!this.heatmapMapRef || !this.dashboardData?.destination_heatmap) return;
    if (this.heatmapMap) {
      this.heatmapMap.remove();
      this.heatmapMap = null;
    }

    const points = this.dashboardData.destination_heatmap;
    const validPoints = points.filter(p => p.end_lat && p.end_lng);

    if (validPoints.length === 0) return;

    // Center on first point or default Tunis
    const center = validPoints.length > 0
      ? [validPoints[0].end_lat, validPoints[0].end_lng]
      : [36.8065, 10.1815];

    this.heatmapMap = L.map(this.heatmapMapRef.nativeElement).setView(center as L.LatLngExpression, 10);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO'
    }).addTo(this.heatmapMap);

    // Color scale based on count
    const maxCount = Math.max(...points.map(p => p.count));

    points.forEach((p: any) => {
      if (!p.end_lat || !p.end_lng) return;
      const intensity = p.count / maxCount;
      const radius = 8 + intensity * 20;
      const color = intensity > 0.6 ? '#dc2626' : intensity > 0.3 ? '#f59e0b' : '#3b82f6';

      L.circleMarker([p.end_lat, p.end_lng], {
        radius,
        fillColor: color,
        color: color,
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.6
      }).addTo(this.heatmapMap!)
        .bindPopup(`<b>${p.destination}</b><br>${p.count} réservation(s)`);
    });
  }

  private initVehiclesChart(): void {
    if (!this.vehiclesChartRef) return;

    const ctx = this.vehiclesChartRef.nativeElement.getContext('2d');
    const vehicles = this.dashboardData?.vehicles;

    if (!vehicles) return;

    if (this.vehiclesChart) this.vehiclesChart.destroy();

    this.vehiclesChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Disponible', 'Affecté', 'En maintenance', 'En panne'],
        datasets: [{
          data: [vehicles.disponible, vehicles.reserve, vehicles.maintenance, vehicles.panne],
          backgroundColor: [
            '#10b981', // emerald-500
            '#3b82f6', // blue-500
            '#f59e0b', // amber-500
            '#ef4444'  // red-500
          ],
          borderWidth: 0,
          hoverOffset: 6,
          borderRadius: 4 // Rounded segments!
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '72%', // Modern thin ring
        plugins: {
          title: {
            display: true,
            text: 'État des véhicules',
            font: { size: 16, weight: 'bold', family: "'Inter', sans-serif" },
            color: '#1e293b',
            padding: { bottom: 20 }
          },
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 20,
              font: { family: "'Inter', sans-serif", size: 13 },
              color: '#475569'
            }
          },
          tooltip: {
            backgroundColor: '#1e293b',
            padding: 12,
            titleFont: { size: 13, family: "'Inter', sans-serif" },
            bodyFont: { size: 14, weight: 'bold', family: "'Inter', sans-serif" },
            callbacks: {
              label: (context: any) => ` ${context.label}: ${context.parsed} véhicule(s)`
            }
          }
        }
      }
    });
  }

  // ==========================
  // 🏢 PARKING CONFIG METHODS
  // ==========================

  loadParkingSettings(): void {
    this.companySettingService.getSettings().subscribe((settings: CompanySetting | null) => {
      if (settings) {
        this.parkingSettings = settings;
      }
    });
  }

  openParkingModal(): void {
    this.showParkingModal = true;
    setTimeout(() => this.initParkingMap(), 300);
  }

  closeParkingModal(): void {
    this.showParkingModal = false;
    if (this.parkingMap) {
      this.parkingMap.remove();
      this.parkingMap = null;
    }
  }

  initParkingMap(): void {
    if (!this.parkingMapContainer) return;

    this.parkingMap = L.map(this.parkingMapContainer.nativeElement).setView(
      [this.parkingSettings.parking_lat, this.parkingSettings.parking_lng],
      13
    );

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; CARTO'
    }).addTo(this.parkingMap);

    const icon = L.divIcon({
      className: 'modern-dot-marker',
      html: '<div class="dot-pin blue"><span>P</span></div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    this.parkingMarker = L.marker(
      [this.parkingSettings.parking_lat, this.parkingSettings.parking_lng],
      { draggable: true, icon }
    ).addTo(this.parkingMap);

    this.parkingMarker.on('dragend', () => {
      const pos = this.parkingMarker!.getLatLng();
      this.parkingSettings.parking_lat = pos.lat;
      this.parkingSettings.parking_lng = pos.lng;
    });

    this.parkingMap.on('click', (e: L.LeafletMouseEvent) => {
      this.parkingMarker!.setLatLng(e.latlng);
      this.parkingSettings.parking_lat = e.latlng.lat;
      this.parkingSettings.parking_lng = e.latlng.lng;
    });
  }

  searchLocation(): void {
    if (!this.searchAddress) return;
    this.isSearchingAddress = true;

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.searchAddress)}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data && data.length > 0) {
          const result = data[0];
          const lat = parseFloat(result.lat);
          const lon = parseFloat(result.lon);

          this.parkingSettings.parking_lat = lat;
          this.parkingSettings.parking_lng = lon;
          this.parkingSettings.parking_address = result.display_name;

          if (this.parkingMap && this.parkingMarker) {
            this.parkingMap.setView([lat, lon], 15);
            this.parkingMarker.setLatLng([lat, lon]);
          }
        } else {
          this.toastService.info('Aucun résultat trouvé');
        }
        this.isSearchingAddress = false;
      })
      .catch(err => {
        console.error(err);
        this.isSearchingAddress = false;
      });
  }

  saveParkingSettings(): void {
    this.companySettingService.updateSettings(this.parkingSettings).subscribe({
      next: () => {
        this.toastService.success('Localisation du parking mise à jour !');
        this.closeParkingModal();
      },
      error: () => this.toastService.error('Erreur lors de la mise à jour')
    });
  }
}
