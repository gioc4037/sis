export interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: 'supervisor' | 'user';
  created_at: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'validated';
  assigned_to: string;
  assigned_by: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  validated_at?: string;
  assigned_user?: User;
  supervisor?: User;
}
