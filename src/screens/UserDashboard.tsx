import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Task } from '../types';

export default function UserDashboard() {
  const { user, signOut } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'validated'>('all');
  const [menuOpen, setMenuOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);

  useEffect(() => {
    fetchTasks();

    const channel = supabase
      .channel('tasks-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => fetchTasks()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filter]);

  async function fetchTasks() {
    let query = supabase
      .from('tasks')
      .select('*, supervisor:profiles!tasks_assigned_by_fkey(full_name)')
      .eq('assigned_to', user?.id)
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data } = await query;
    if (data) setTasks(data as Task[]);
  }

  async function handleStatusChange(taskId: string, newStatus: 'in_progress' | 'completed') {
    const update: any = { status: newStatus };
    if (newStatus === 'completed') {
      update.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('tasks')
      .update(update)
      .eq('id', taskId);

    if (!error) fetchTasks();
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

          <View style={styles.filterCard}>
            <View style={styles.filterHeader}>
              <Ionicons name="funnel-outline" size={16} color="#64748B" />
              <Text style={styles.filterTitle}>Filtrar por estado</Text>
            </View>
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
          </View>

          {tasks.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="document-text-outline" size={40} color="#CBD5E1" />
              </View>
              <Text style={styles.emptyTitle}>No hay tareas asignadas</Text>
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
                <Text style={styles.assignedBy}>Asignada por: {(item.supervisor as any)?.full_name || 'N/A'}</Text>

                {item.status === 'pending' && (
                  <TouchableOpacity style={styles.actionButton} onPress={() => handleStatusChange(item.id, 'in_progress')}>
                    <Ionicons name="play-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}> Iniciar tarea</Text>
                  </TouchableOpacity>
                )}

                {item.status === 'in_progress' && (
                  <TouchableOpacity style={styles.actionButtonGreen} onPress={() => handleStatusChange(item.id, 'completed')}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.actionButtonText}> Completar tarea</Text>
                  </TouchableOpacity>
                )}

                {item.status === 'validated' && (
                  <View style={styles.validatedRow}>
                    <Ionicons name="shield-checkmark-outline" size={16} color="#008F4C" />
                    <Text style={styles.validatedText}> Tarea validada por supervisor</Text>
                  </View>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
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

  body: { flex: 1 },
  bodyContent: { paddingBottom: 24 },
  innerContainer: { maxWidth: 960, alignSelf: 'center', width: '100%', paddingHorizontal: 16 },

  statsRow: { flexDirection: 'row', marginTop: 16 },
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

  filterCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    marginTop: 16,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  filterTitle: {
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
  dropdownItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownItemText: {
    fontSize: 13,
    color: '#374151',
  },
  dropdownItemTextActive: {
    color: '#008F4C',
    fontWeight: '600',
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

  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginTop: 10,
  },
  taskTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskTitle: { fontSize: 15, fontWeight: '600', color: '#111827', flex: 1, marginRight: 8 },
  statusBadge: { borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
  statusBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  taskDescription: { fontSize: 13, color: '#6B7280', marginTop: 8 },
  assignedBy: { fontSize: 12, color: '#9CA3AF', marginTop: 8 },

  actionButton: {
    backgroundColor: '#008F4C',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  actionButtonGreen: {
    backgroundColor: '#008F4C',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  actionButtonText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  validatedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  validatedText: { color: '#008F4C', fontWeight: '600', fontSize: 13 },

  emptyState: { alignItems: 'center', paddingVertical: 48, marginTop: 16 },
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
});
