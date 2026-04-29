export interface Employee {
  id?: number;
  nom: string;
  email: string;
  password?: string;
  // include all role string values returned by the backend (match backend role names)
  role: 'admin' | 'employee' | 'responsable';
  role_id?: number;
  tel: string;
  is_first_login?: boolean;
  created_at?: Date;
  updated_at?: Date;
}
