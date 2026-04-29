import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { Employee } from '../../../shared/models/employee';

interface RoleItem { id: number; name: string }

@Component({
  selector: 'app-employee-list',
  templateUrl: './employee-list.component.html',
  styleUrls: ['./employee-list.component.css']
})
export class EmployeeListComponent implements OnInit {
  employees: Employee[] = [];
  selectedEmployee: Employee | null = null;
  loading = true;
  error = '';
  showModal = false;
  modalMode: 'view' | 'edit' | 'delete' = 'view';
  // create form
  showCreateModal = false;
  roles: RoleItem[] = [];
  newEmployee: { nom?: string; email?: string; tel?: string; role_id?: number } = {
    nom: '',
    email: '',
    tel: '',
    role_id: undefined
  };
  creating = false;
  createError = '';
  importing = false;

  searchQuery = '';
  appliedSearchQuery = '';

  isAdmin = false;
  isResponsable = false;

  constructor(private employeeService: EmployeeService, private authService: AuthService) { }

  // Get filtered list for table based on applied search query
  get filteredEmployees(): Employee[] {
    if (!this.appliedSearchQuery) {
      return this.employees;
    }
    const q = this.appliedSearchQuery.toLowerCase();
    return this.employees.filter(emp => {
      return (emp.nom && emp.nom.toLowerCase().includes(q)) ||
        (emp.email && emp.email.toLowerCase().includes(q)) ||
        (emp.tel && emp.tel.toLowerCase().includes(q)) ||
        (emp.role && emp.role.toLowerCase().includes(q));
    });
  }

  applyFilter(): void {
    this.appliedSearchQuery = this.searchQuery;
  }

  ngOnInit(): void {
    this.isAdmin = this.authService.isAdmin();
    this.isResponsable = this.authService.isResponsable();

    this.loadEmployees();
    // try to fetch roles so the create form can populate
    this.employeeService.getRoles().subscribe({
      next: (r) => this.roles = r,
      error: (err) => console.warn('Cannot fetch roles (not admin or unauthenticated):', err)
    });
  }

  openCreate(): void {
    this.showCreateModal = true;
    this.createError = '';
  }

  closeCreate(): void {
    this.showCreateModal = false;
    this.resetForm();
  }

  resetForm(): void {
    this.newEmployee = { nom: '', email: '', tel: '', role_id: undefined };
    this.creating = false;
    this.createError = '';
  }

  createEmployee(): void {
    // basic validation (role_id required)
    if (!this.newEmployee.nom || !this.newEmployee.email || !this.newEmployee.role_id) {
      this.createError = 'Veuillez remplir le nom, l\'email et choisir un rôle.';
      return;
    }

    this.creating = true;
    const payload = {
      nom: this.newEmployee.nom,
      email: this.newEmployee.email,
      tel: this.newEmployee.tel,
      role_id: this.newEmployee.role_id
    };

    this.employeeService.create(payload as any).subscribe({
      next: (created) => {
        // prepend to list and close modal
        this.employees.unshift(created);
        this.creating = false;
        this.closeCreate();
      },
      error: (err) => {
        console.error('Erreur création:', err);
        this.createError = 'Erreur lors de la création de l\'employé.';
        this.creating = false;
      }
    });
  }

  loadEmployees(): void {
    this.loading = true;
    this.employeeService.getAll().subscribe({
      next: (data) => {
        this.employees = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement des employés';
        this.loading = false;
        console.error(err);
      }
    });
  }

  openActionModal(employee: Employee, mode: 'view' | 'edit' | 'delete'): void {
    this.modalMode = mode;
    // Clone to allow editing without affecting the list directly until saved
    this.selectedEmployee = { ...employee };

    // Map string role to role_id for the dropdown pre-selection
    if (employee.role && this.roles.length > 0) {
      const match = this.roles.find(r => r.name === employee.role);
      if (match) {
        this.selectedEmployee.role_id = match.id;
      }
    }

    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.selectedEmployee = null;
  }

  deleteEmployee(id: number): void {
    this.employeeService.delete(id).subscribe({
      next: () => {
        this.employees = this.employees.filter(e => e.id !== id);
        this.closeModal();
      },
      error: (err) => console.error('Erreur suppression:', err)
    });
  }

  // New method for saving changes from the modal
  saveEmployeeChanges(): void {
    if (!this.selectedEmployee || !this.selectedEmployee.id) return;

    // API call to update employee
    this.employeeService.update(this.selectedEmployee.id, this.selectedEmployee).subscribe({
      next: (response: any) => {
        // Le backend Laravel retourne { message: '...', employee: {...} }
        const updatedEmp = response.employee || response;

        const idx = this.employees.findIndex(e => e.id === updatedEmp.id);
        if (idx !== -1) {
          this.employees[idx] = updatedEmp;
        }

        // Ensure UI updates string role if we sent role_id
        if (this.selectedEmployee?.role_id) {
          const roleObj = this.roles.find(r => r.id === this.selectedEmployee!.role_id);
          if (roleObj) {
            this.employees[idx].role = roleObj.name as any;
          }
        }

        this.closeModal();
      },
      error: (err) => {
        console.error('Erreur de mise à jour:', err);
        alert('Erreur: ' + (err.error?.message || 'Impossible de mettre à jour'));
      }
    });
  }

  exportToCSV(): void {
    if (this.employees.length === 0) return;

    const headers = ['ID', 'Nom du membre', 'Mobile', 'Email', 'Role'];
    const rows = this.employees.map(emp => [
      emp.id,
      `"${emp.nom}"`,
      `"${emp.tel || ''}"`,
      `"${emp.email}"`,
      `"${emp.role || 'employe'}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    // Create an invisible link to trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'employees_list.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    this.importing = true;
    const reader = new FileReader();

    reader.onload = (e: any) => {
      const text = e.target.result;
      this.parseCSVAndImport(text);
      event.target.value = ''; // Reset file input
    };

    reader.onerror = () => {
      console.error('Error reading file');
      this.importing = false;
    };

    reader.readAsText(file);
  }

  parseCSVAndImport(csvText: string): void {
    const lines = csvText.split('\n').filter(l => l.trim() !== '');
    if (lines.length < 2) {
      alert('Fichier CSV invalide ou vide');
      this.importing = false;
      return;
    }

    const headers = lines[0].split(',').map(h => h.replace(/["']/g, '').trim().toLowerCase());

    const idxNom = headers.findIndex(h => h.includes('nom') || h.includes('name'));
    const idxTel = headers.findIndex(h => h.includes('mobile') || h.includes('tel') || h.includes('phone'));
    const idxEmail = headers.findIndex(h => h.includes('email') || h.includes('mail'));
    const idxRole = headers.findIndex(h => h.includes('role'));

    if (idxNom === -1 || idxEmail === -1) {
      alert('Le fichier CSV doit contenir au moins les colonnes "Nom" et "Email"');
      this.importing = false;
      return;
    }

    const promises: Promise<void>[] = [];

    for (let i = 1; i < lines.length; i++) {
      // Split standard CSV by comma
      const cols = lines[i].split(',');

      const cleanCols = cols.map(v => v.replace(/^"|"$/g, '').trim());

      const nom = cleanCols[idxNom];
      const email = cleanCols[idxEmail];
      const tel = idxTel !== -1 && idxTel < cleanCols.length && cleanCols[idxTel] !== 'undefined' ? cleanCols[idxTel] : '';
      const roleStr = idxRole !== -1 && idxRole < cleanCols.length ? cleanCols[idxRole] : 'employe';

      if (!nom || !email || nom.toLowerCase() === 'undefined' || email.toLowerCase() === 'undefined') continue;

      let matchedRoleId: number | undefined;
      const roleL = roleStr.toLowerCase();
      if (roleL.includes('admin')) matchedRoleId = this.roles.find(r => r.name === 'admin')?.id;
      else if (roleL.includes('resp')) matchedRoleId = this.roles.find(r => r.name === 'responsable')?.id;
      else matchedRoleId = this.roles.find(r => r.name === 'employee')?.id;

      // Default role based on what's available
      if (!matchedRoleId && this.roles.length > 0) {
        matchedRoleId = this.roles.find(r => r.name === 'employee')?.id || this.roles[this.roles.length - 1].id;
      }

      const payload = { nom, email, tel, role_id: matchedRoleId };

      const p = new Promise<void>((resolve) => {
        this.employeeService.create(payload as any).subscribe({
          next: (created) => {
            this.employees.unshift(created);
            resolve();
          },
          error: (err) => {
            console.error('Ligne ' + i + ' erreur:', err);
            resolve(); // Resolve to let Promise.all finish
          }
        });
      });

      promises.push(p);
    }

    if (promises.length === 0) {
      alert('Aucune donnée valide trouvée.');
      this.importing = false;
      return;
    }

    Promise.all(promises).then(() => {
      this.importing = false;
      alert(`Importation terminée ! ${promises.length} employé(s) traité(s).`);
    });
  }
}
