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

  reservationsChart: any = null;
  vehiclesChart: any = null;

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
      next: (data) => {
        this.dashboardData = data;
        this.loading = false;

        // Highlight pending/recent reservations in calendar
        if (data.pending_reservations) {
          data.pending_reservations.forEach(res => {
            const d = new Date(res.date_debut);
            if (d.getMonth() === this.currentDate.getMonth()) {
              this.reservedDates.add(d.getDate());
            }
          });
        }

        setTimeout(() => this.initCharts(), 100);
      },
      error: (err) => {
        this.error = 'Erreur: ' + (err.error?.message || err.message || 'Erreur lors du chargement du dashboard');
        this.loading = false;
        console.error('Dashboard error:', err);
      }
    });
  }

  loadEmployees(): void {
    this.employeeService.getAll().subscribe({
      next: (data) => {
        this.employees = data.slice(0, 5);
      },
      error: (err) => console.error('Error loading employees', err)
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

    this.reservationsChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: chartData.map(d => d.month),
        datasets: [{
          label: 'Réservations',
          data: chartData.map(d => d.count),
          backgroundColor: 'rgba(106, 27, 154, 0.8)',
          borderColor: 'rgba(106, 27, 154, 1)',
          borderWidth: 2,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Réservations par mois',
            font: { size: 16, weight: 'bold' }
          },
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 }
          }
        }
      }
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
            'rgba(76, 175, 80, 0.8)',
            'rgba(33, 150, 243, 0.8)',
            'rgba(255, 152, 0, 0.8)',
            'rgba(244, 67, 54, 0.8)'
          ],
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'État des véhicules',
            font: { size: 16, weight: 'bold' }
          },
          legend: {
            position: 'bottom',
            labels: { padding: 15 }
          }
        }
      }
    });
  }

  // ==========================
  // 🏢 PARKING CONFIG METHODS
  // ==========================

  loadParkingSettings(): void {
    this.companySettingService.getSettings().subscribe(settings => {
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
