import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Task, User } from '../types';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'SupervisorDashboard'>;

export default function SupervisorDashboard({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'validated'>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [usersModalVisible, setUsersModalVisible] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, [filter, userFilter]);

  async function fetchUsers() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'user');
    if (data) setUsers(data);
  }

  async function fetchTasks() {
    let query = supabase
      .from('tasks')
      .select('*, assigned_user:profiles!tasks_assigned_to_fkey(full_name, email)')
      .eq('assigned_by', user?.id)
      .order('created_at', { ascending: false });
    if (filter !== 'all') query = query.eq('status', filter);
    if (userFilter !== 'all') query = query.eq('assigned_to', userFilter);
    const { data } = await query;
    if (data) setTasks(data as Task[]);
  }

  async function handleAssignTask() {
    if (!title || !selectedUser) {
      window.alert('Completa el titulo y selecciona un usuario');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('tasks').insert({
      title,
      description,
      assigned_to: selectedUser.id,
      assigned_by: user?.id,
      status: 'pending',
    });
    setLoading(false);
    setModalVisible(false);
    setTitle('');
    setDescription('');
    setSelectedUser(null);
    if (error) window.alert(error.message);
    else fetchTasks();
  }

  async function handleValidateTask(taskId: string) {
    const { error } = await supabase
      .from('tasks')
      .update({ status: 'validated', validated_at: new Date().toISOString() })
      .eq('id', taskId);
    if (error) {
      window.alert(error.message);
    } else {
      fetchTasks();
    }
  }

  async function handleResetPassword() {
    if (!resetTargetUser || !newPassword) {
      window.alert('Completa la nueva contraseña');
      return;
    }
    if (newPassword.length < 6) {
      window.alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setResetLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const res = await fetch(
        `${supabase.supabaseUrl}/functions/v1/reset-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionData.session?.access_token}`,
            apikey: supabase.supabaseKey,
          },
          body: JSON.stringify({ user_id: resetTargetUser.id, new_password: newPassword }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error al actualizar contraseña');
      window.alert(`Contraseña de ${resetTargetUser.full_name} actualizada`);
      setResetModalVisible(false);
      setResetTargetUser(null);
      setNewPassword('');
    } catch (error: any) {
      window.alert(error.message);
    } finally {
      setResetLoading(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'pending': return '#D97706';
      case 'in_progress': return '#008F4C';
      case 'completed': return '#008F4C';
      case 'validated': return '#008F4C';
      default: return '#6B7280';
    }
  }

  function getStatusLabel(status: string) {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'in_progress': return 'En progreso';
      case 'completed': return 'Completada';
      case 'validated': return 'Validada';
      default: return status;
    }
  }

  function getCount(status: string) {
    if (status === 'all') return tasks.length;
    return tasks.filter((t) => t.status === status).length;
  }

  const allTasks = tasks.length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="checkmark-done" size={20} color="#008F4C" />
          <Text style={styles.headerTitle}>Task Manager</Text>
        </View>
        <View>
          <TouchableOpacity style={styles.menuBtn} onPress={() => setMenuOpen(!menuOpen)}>
            <Ionicons name="ellipsis-vertical" size={20} color="#CBD5E1" />
          </TouchableOpacity>
          {menuOpen && (
            <View style={styles.menuDropdown}>
              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuOpen(false); navigation.navigate('CreateUser'); }}>
                <Ionicons name="person-add-outline" size={16} color="#008F4C" />
                <Text style={styles.menuItemText}>Crear usuario</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuOpen(false); setModalVisible(true); }}>
                <Ionicons name="add-circle-outline" size={16} color="#008F4C" />
                <Text style={styles.menuItemText}>Crear tarea</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuOpen(false); setUsersModalVisible(true); }}>
                <Ionicons name="people-outline" size={16} color="#008F4C" />
                <Text style={styles.menuItemText}>Gestionar usuarios</Text>
              </TouchableOpacity>
              <View style={styles.menuDivider} />
              <TouchableOpacity style={styles.menuItem} onPress={() => { setMenuOpen(false); signOut(); }}>
                <Ionicons name="log-out-outline" size={16} color="#D91E18" />
                <Text style={[styles.menuItemText, { color: '#D91E18' }]}>Cerrar sesión</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <View style={styles.innerContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <View style={[styles.statIconCircle, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="time-outline" size={20} color="#D97706" />
              </View>
              <Text style={styles.statNumber}>{tasks.filter((t) => t.status === 'pending').length}</Text>
              <Text style={styles.statLabel}>Pendientes</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconCircle, { backgroundColor: '#C8E6C9' }]}>
                <Ionicons name="sync-outline" size={20} color="#008F4C" />
              </View>
              <Text style={styles.statNumber}>{tasks.filter((t) => t.status === 'in_progress').length}</Text>
              <Text style={styles.statLabel}>En progreso</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconCircle, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#008F4C" />
              </View>
              <Text style={styles.statNumber}>{tasks.filter((t) => t.status === 'completed').length}</Text>
              <Text style={styles.statLabel}>Completadas</Text>
            </View>
            <View style={styles.statCard}>
              <View style={[styles.statIconCircle, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="ribbon-outline" size={20} color="#008F4C" />
              </View>
              <Text style={styles.statNumber}>{tasks.filter((t) => t.status === 'validated').length}</Text>
              <Text style={styles.statLabel}>Validadas</Text>
            </View>
          </View>

          <View style={styles.userFilterCard}>
            <View style={styles.userFilterHeader}>
              <Ionicons name="funnel-outline" size={16} color="#64748B" />
              <Text style={styles.userFilterTitle}>Filtros</Text>
            </View>

            <Text style={styles.filterLabel}>Estado</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setStatusDropdownOpen(!statusDropdownOpen)}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownText}>
                {filter === 'all' ? 'Todos los estados' : getStatusLabel(filter)}
              </Text>
              <Ionicons name={statusDropdownOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#64748B" />
            </TouchableOpacity>
            {statusDropdownOpen && (
              <View style={styles.dropdownList}>
                {(['all', 'pending', 'in_progress', 'completed', 'validated'] as const).map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.dropdownItem, filter === f && styles.dropdownItemActive]}
                    onPress={() => { setFilter(f); setStatusDropdownOpen(false); }}
                  >
                    <View style={styles.dropdownItemRow}>
                      {filter === f && <Ionicons name="checkmark" size={14} color="#008F4C" style={{ marginRight: 6 }} />}
                      <Text style={[styles.dropdownItemText, filter === f && styles.dropdownItemTextActive]}>
                        {f === 'all' ? 'Todos los estados' : getStatusLabel(f)}
                      </Text>
                    </View>
                    <View style={[styles.filterCountBadge, { backgroundColor: getStatusColor(f === 'all' ? 'pending' : f) + '20' }]}>
                      <Text style={[styles.filterCountText, { color: getStatusColor(f === 'all' ? 'pending' : f) }]}>
                        {getCount(f)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={[styles.filterLabel, { marginTop: 12 }]}>Usuario</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setUserDropdownOpen(!userDropdownOpen)}
              activeOpacity={0.7}
            >
              <Text style={styles.dropdownText}>
                {userFilter === 'all'
                  ? 'Todos los usuarios'
                  : users.find((u) => u.id === userFilter)?.full_name || 'Desconocido'}
              </Text>
              <Ionicons name={userDropdownOpen ? 'chevron-up' : 'chevron-down'} size={18} color="#64748B" />
            </TouchableOpacity>
            {userDropdownOpen && (
              <View style={styles.dropdownList}>
                <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                  <TouchableOpacity
                    style={[styles.dropdownItem, userFilter === 'all' && styles.dropdownItemActive]}
                    onPress={() => { setUserFilter('all'); setUserDropdownOpen(false); }}
                  >
                    <Text style={[styles.dropdownItemText, userFilter === 'all' && styles.dropdownItemTextActive]}>
                      Todos los usuarios
                    </Text>
                  </TouchableOpacity>
                  {users.map((u) => (
                    <TouchableOpacity
                      key={u.id}
                      style={[styles.dropdownItem, userFilter === u.id && styles.dropdownItemActive]}
                      onPress={() => { setUserFilter(u.id); setUserDropdownOpen(false); }}
                    >
                      <Text style={[styles.dropdownItemText, userFilter === u.id && styles.dropdownItemTextActive]}>
                        {u.full_name}
                      </Text>
                      <Text style={styles.dropdownItemSub}>{u.username}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {allTasks === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="document-text-outline" size={40} color="#CBD5E1" />
              </View>
              <Text style={styles.emptyTitle}>No hay tareas</Text>
              <Text style={styles.emptySubtitle}>Crea tu primera tarea para comenzar</Text>
              <TouchableOpacity style={styles.emptyCta} onPress={() => setModalVisible(true)}>
                <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.emptyCtaText}>Crear tarea</Text>
              </TouchableOpacity>
            </View>
          ) : (
            tasks.map((item) => (
              <View key={item.id} style={styles.taskCard}>
                <View style={styles.taskTopRow}>
                  <Text style={styles.taskTitle}>{item.title}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
                    <Text style={styles.statusBadgeText}>{getStatusLabel(item.status)}</Text>
                  </View>
                </View>
                {item.description ? <Text style={styles.taskDescription}>{item.description}</Text> : null}
                <Text style={styles.assignedTo}>Asignada a: {(item.assigned_user as any)?.full_name || 'N/A'}</Text>
                {item.status === 'completed' && (
                  <TouchableOpacity style={styles.validateButton} onPress={() => handleValidateTask(item.id)}>
                    <Text style={styles.validateButtonText}>Validar tarea</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>Asignar Nueva Tarea</Text>

              <Text style={styles.label}>Titulo *</Text>
              <TextInput style={styles.input} placeholder="Titulo de la tarea" value={title} onChangeText={setTitle} />

              <Text style={styles.label}>Descripcion</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Descripcion detallada"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Asignar a *</Text>
              <View style={styles.userList}>
                {users.map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    style={[styles.userOption, selectedUser?.id === u.id && styles.userOptionActive]}
                    onPress={() => setSelectedUser(u)}
                  >
                    <Text style={[styles.userOptionText, selectedUser?.id === u.id && styles.userOptionTextActive]}>
                      {u.full_name}
                    </Text>
                    <Text style={styles.userEmail}>{u.username}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalAssignBtn, loading && styles.buttonDisabled]}
                  onPress={handleAssignTask}
                  disabled={loading}
                >
                  <Text style={styles.modalAssignBtnText}>{loading ? 'Asignando...' : 'Asignar'}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={usersModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <View style={styles.usersModalHeader}>
                <Text style={styles.modalTitle}>Usuarios</Text>
                <TouchableOpacity onPress={() => setUsersModalVisible(false)}>
                  <Ionicons name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              {users.length === 0 ? (
                <Text style={{ textAlign: 'center', color: '#9CA3AF', padding: 20 }}>No hay usuarios registrados</Text>
              ) : (
                users.map((u) => (
                  <View key={u.id} style={styles.userManageCard}>
                    <View style={styles.userManageInfo}>
                      <View style={styles.userManageAvatar}>
                        <Text style={styles.userManageAvatarText}>{u.full_name.charAt(0).toUpperCase()}</Text>
                      </View>
                      <View>
                        <Text style={styles.userManageName}>{u.full_name}</Text>
                        <Text style={styles.userManageUsername}>@{u.username}</Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={styles.resetPasswordBtn}
                      onPress={() => { setResetTargetUser(u); setNewPassword(''); setResetModalVisible(true); }}
                    >
                      <Ionicons name="key-outline" size={16} color="#008F4C" />
                      <Text style={styles.resetPasswordBtnText}>Contraseña</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={resetModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.usersModalHeader}>
              <Text style={styles.modalTitle}>Resetear contraseña</Text>
              <TouchableOpacity onPress={() => setResetModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            {resetTargetUser && (
              <View style={styles.resetUserInfo}>
                <Text style={styles.resetUserName}>{resetTargetUser.full_name}</Text>
                <Text style={styles.resetUserUsername}>@{resetTargetUser.username}</Text>
              </View>
            )}
            <Text style={styles.label}>Nueva contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder="Minimo 6 caracteres"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setResetModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalAssignBtn, resetLoading && styles.buttonDisabled]}
                onPress={handleResetPassword}
                disabled={resetLoading}
              >
                <Text style={styles.modalAssignBtnText}>{resetLoading ? 'Actualizando...' : 'Actualizar'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#008F4C',
    zIndex: 1000,
    elevation: 1000,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 16, fontWeight: '700', color: '#F8FAFC', marginLeft: 8 },
  menuBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuDropdown: {
    position: 'absolute',
    top: 38,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    width: 180,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 100,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  menuItemText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
    marginLeft: 10,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dropdownItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterCountBadge: {
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '700',
  },

  body: { flex: 1 },
  bodyContent: { paddingBottom: 24 },
  innerContainer: { maxWidth: 960, alignSelf: 'center', width: '100%', paddingHorizontal: 16 },

  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statNumber: { fontSize: 28, fontWeight: '700', color: '#111827' },
  statLabel: { fontSize: 11, color: '#6B7280', marginTop: 4, textAlign: 'center' },

  userFilterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginTop: 16,
  },
  userFilterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  userFilterTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 6,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 42,
  },
  dropdownText: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '500',
  },
  dropdownList: {
    marginTop: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropdownItemActive: {
    backgroundColor: '#E8F5E9',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#374151',
  },
  dropdownItemTextActive: {
    color: '#008F4C',
    fontWeight: '600',
  },
  dropdownItemSub: {
    fontSize: 11,
    color: '#9CA3AF',
  },

  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginTop: 10,
  },
  taskTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskTitle: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  statusBadge: { borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
  statusBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  taskDescription: { fontSize: 13, color: '#6B7280', marginTop: 8 },
  assignedTo: { fontSize: 12, color: '#9CA3AF', marginTop: 8 },
  validateButton: {
    backgroundColor: '#008F4C',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    marginTop: 12,
  },
  validateButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    marginTop: 16,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#374151' },
  emptySubtitle: { fontSize: 14, color: '#9CA3AF', marginTop: 6 },
  emptyCta: {
    backgroundColor: '#008F4C',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyCtaText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 14, fontSize: 16, marginBottom: 16, outlineStyle: 'none' },
  textArea: { height: 80, textAlignVertical: 'top' },
  userList: { marginBottom: 20 },
  userOption: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 14, marginBottom: 8 },
  userOptionActive: { backgroundColor: '#E8F5E9', borderColor: '#008F4C' },
  userOptionText: { fontSize: 15, fontWeight: '500', color: '#111827' },
  userOptionTextActive: { color: '#008F4C' },
  userEmail: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
  modalButtons: { flexDirection: 'row', marginTop: 8 },
  cancelButton: { flex: 1, borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 10, padding: 14, alignItems: 'center', marginRight: 8 },
  cancelButtonText: { color: '#6B7280', fontWeight: '600' },
  modalAssignBtn: { flex: 1, backgroundColor: '#008F4C', borderRadius: 10, padding: 14, alignItems: 'center' },
  modalAssignBtnText: { color: '#fff', fontWeight: '600' },
  buttonDisabled: { opacity: 0.6 },
  usersModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  userManageCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  userManageInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  userManageAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  userManageAvatarText: { fontSize: 15, fontWeight: '700', color: '#008F4C' },
  userManageName: { fontSize: 14, fontWeight: '600', color: '#111827' },
  userManageUsername: { fontSize: 12, color: '#9CA3AF' },
  resetPasswordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  resetPasswordBtnText: { fontSize: 12, fontWeight: '600', color: '#008F4C', marginLeft: 4 },
  resetUserInfo: { backgroundColor: '#F9FAFB', borderRadius: 10, padding: 14, marginBottom: 16, alignItems: 'center' },
  resetUserName: { fontSize: 16, fontWeight: '700', color: '#111827' },
  resetUserUsername: { fontSize: 13, color: '#9CA3AF', marginTop: 2 },
});
