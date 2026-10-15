import React, { useState } from 'react';
import { Search, Plus, Users, Phone, CheckCircle2, X, Key, Trash2, Lock } from 'lucide-react';
import { useUsers, useCreateUser, useDeleteUser, useUpdateUser } from '../../hooks/useUsers';
import { Role } from '../../types';

const ROLE_DESCRIPTIONS: Record<string, string> = {
  [Role.ADMIN]: 'Full access to all features and settings.',
  [Role.DISPATCHER]: 'Can manage loads and drivers. No access to billing or settlements.',
  [Role.DRIVER]: 'Limited access, can only view assigned loads and update status.',
};

const ROLE_OPTIONS = [
  { value: Role.ADMIN, label: 'Super Admin' },
  { value: Role.DISPATCHER, label: 'Dispatcher' },
  { value: Role.DRIVER, label: 'Driver' },
];

const TeamPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'members' | 'credentials'>('members');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ userId: string; userName: string } | null>(null);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editCredentialsError, setEditCredentialsError] = useState('');
  const [isEditingCredentials, setIsEditingCredentials] = useState(false);

  const [credentialsFormData, setCredentialsFormData] = useState({
    email: '',
    password: '',
  });

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: Role.DISPATCHER,
    phone: '',
    payPercentage: '',
  });

  const { data: response, isLoading, error, refetch } = useUsers({ search: searchQuery });
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const users: any[] = response?.data ?? [];
  const activeUsers = users.filter((user) => user.status === 'ACTIVE');

  const getRoleLabel = (role: string) => {
    switch (role) {
      case Role.ADMIN:
        return 'Super Admin';
      case Role.DISPATCHER:
        return 'Dispatcher';
      case Role.DRIVER:
        return 'Driver';
      default:
        return role;
    }
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case Role.ADMIN:
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
      case Role.DISPATCHER:
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300';
      case Role.DRIVER:
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const formatCompensation = (user: any) => {
    if (user.role === Role.DRIVER && user.driverCompensationRate !== null && user.driverCompensationRate !== undefined) {
      if (user.driverCompensationType === 'PERCENT_OF_RATE') {
        return `${user.driverCompensationRate}%`;
      }
      if (user.driverCompensationType === 'PER_MILE') {
        return `$${Number(user.driverCompensationRate).toFixed(2)}/mi`;
      }
    }
    return user.payPercentage !== null && user.payPercentage !== undefined
      ? `${user.payPercentage}%`
      : '—';
  };

  // Role-based access control
  const canDeleteUser = (targetRole: string): boolean => {
    // Super Admin can delete anyone, Admin can delete Dispatchers and Drivers
    if (true) return true; // In real app, check current user role
    return false;
  };

  const canResetPassword = (targetRole: string): boolean => {
    // Super Admin can reset anyone's password
    if (true) return true; // In real app, check current user role
    return false;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setFormError('');
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: Role.DISPATCHER,
      phone: '',
      payPercentage: '',
    });
    setFormError('');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleDeleteUser = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteUser.mutateAsync(deleteConfirm.userId);
      setDeleteConfirm(null);
      await refetch();
    } catch (err: any) {
      console.error('Failed to delete user:', err);
    }
  };

  const handleOpenEditCredentials = (user: any) => {
    setEditingUser(user);
    setCredentialsFormData({
      email: user.email || '',
      password: '',
    });
    setEditCredentialsError('');
  };

  const handleCloseEditCredentials = () => {
    setEditingUser(null);
    setCredentialsFormData({ email: '', password: '' });
    setEditCredentialsError('');
  };

  const handleCredentialsInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentialsFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    setEditCredentialsError('');
  };

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditCredentialsError('');

    if (!credentialsFormData.email.trim()) {
      setEditCredentialsError('Email is required');
      return;
    }

    setIsEditingCredentials(true);
    try {
      const updateData: any = {
        email: credentialsFormData.email,
      };

      // Only include password if provided
      if (credentialsFormData.password.trim()) {
        if (credentialsFormData.password.length < 6) {
          setEditCredentialsError('Password must be at least 6 characters');
          setIsEditingCredentials(false);
          return;
        }
        updateData.password = credentialsFormData.password;
      }

      await updateUser.mutateAsync({
        id: editingUser.id,
        data: updateData,
      });

      await refetch();
      handleCloseEditCredentials();
    } catch (err: any) {
      setEditCredentialsError(
        err?.response?.data?.message || 'Failed to update credentials'
      );
    } finally {
      setIsEditingCredentials(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validation
    if (!formData.firstName.trim()) {
      setFormError('First name is required');
      return;
    }
    if (!formData.lastName.trim()) {
      setFormError('Last name is required');
      return;
    }
    if (!formData.email.trim()) {
      setFormError('Email is required');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      await createUser.mutateAsync({
        first_name: formData.firstName,
        last_name: formData.lastName,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        phone: formData.phone || null,
        pay_percentage: formData.payPercentage ? parseFloat(formData.payPercentage) : null,
      });

      // Refresh users list
      await refetch();
      handleCloseModal();
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to create user');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-[1400px] mx-auto min-h-screen bg-[#F9FAFB] dark:bg-slate-900 font-sans">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[28px] font-bold text-[#111827] dark:text-white">Team</h1>
        <p className="text-[14px] text-[#6B7280] dark:text-slate-400 mt-1">Manage admin staff and dispatcher credentials</p>
      </div>

      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search..."
            className="w-full sm:w-[320px] bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-md py-2 pl-9 pr-4 text-[14px] text-gray-900 dark:text-white placeholder:text-[#9CA3AF] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#1D4ED8] text-white px-4 py-2 rounded-md text-[14px] font-medium hover:bg-blue-700 transition-colors shadow-sm whitespace-nowrap"
        >
          <Users size={16} strokeWidth={2.5} />
          Add Team Member
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-[#E5E7EB] dark:border-slate-700 mb-6">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('members')}
            className={`py-3 px-1 border-b-2 font-medium text-[14px] transition-colors ${
              activeTab === 'members'
                ? 'border-[#1D4ED8] text-[#1D4ED8]'
                : 'border-transparent text-[#6B7280] dark:text-slate-400 hover:text-[#111827] dark:hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users size={18} />
              Team Members
            </div>
          </button>
          <button
            onClick={() => setActiveTab('credentials')}
            className={`py-3 px-1 border-b-2 font-medium text-[14px] transition-colors ${
              activeTab === 'credentials'
                ? 'border-[#1D4ED8] text-[#1D4ED8]'
                : 'border-transparent text-[#6B7280] dark:text-slate-400 hover:text-[#111827] dark:hover:text-slate-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Phone size={18} />
              Login Credentials
            </div>
          </button>
        </div>
      </div>

      {/* Team Members Tab */}
      {activeTab === 'members' && (
        <>
          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md text-[14px]">
              Error loading team members: {(error as any)?.message}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && activeUsers.length === 0 && (
            <div className="bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-md py-20 flex flex-col items-center justify-center">
              <Users className="text-[#9CA3AF] mb-3" size={48} strokeWidth={1.5} />
              <p className="text-[#6B7280] dark:text-slate-400 text-[14px]">No team members found.</p>
            </div>
          )}

          {/* Team Members Table */}
          {!isLoading && !error && activeUsers.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-[#E5E7EB] dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800">
                    <tr>
                      <th className="px-6 py-4 text-left text-[14px] font-medium text-[#4B5563] dark:text-slate-400">
                        Name
                      </th>
                      <th className="px-6 py-4 text-left text-[14px] font-medium text-[#4B5563] dark:text-slate-400">
                        Role
                      </th>
                      <th className="px-6 py-4 text-left text-[14px] font-medium text-[#4B5563] dark:text-slate-400">
                        Phone
                      </th>
                      <th className="px-6 py-4 text-left text-[14px] font-medium text-[#4B5563] dark:text-slate-400">
                        Notifications
                      </th>
                      <th className="px-6 py-4 text-left text-[14px] font-medium text-[#4B5563] dark:text-slate-400">
                        Compensation
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] dark:divide-slate-700">
                    {activeUsers.map((user: any) => (
                      <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4 text-[#111827] dark:text-slate-200 font-medium">
                          {user.firstName && user.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user.email || '—'}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-[12px] font-bold ${getRoleBadgeStyle(
                              user.role
                            )}`}
                          >
                            {getRoleLabel(user.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[#111827] dark:text-slate-200">
                          {user.phone || '—'}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex px-3 py-1 rounded-full text-[12px] font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            <CheckCircle2 size={14} className="mr-1" />
                            Eligible
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[#6B7280] dark:text-slate-400">
                          {formatCompensation(user)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Login Credentials Tab */}
      {activeTab === 'credentials' && (
        <>
          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-center py-20">
              <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          )}

          {/* Error State */}
          {error && !isLoading && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-md text-[14px]">
              Error loading credentials: {(error as any)?.message}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && activeUsers.length === 0 && (
            <div className="bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-md py-20 flex flex-col items-center justify-center">
              <Lock className="text-[#9CA3AF] mb-3" size={48} strokeWidth={1.5} />
              <p className="text-[#6B7280] dark:text-slate-400 text-[14px]">No login credentials to manage.</p>
            </div>
          )}

          {/* Login Credentials Table */}
          {!isLoading && !error && activeUsers.length > 0 && (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-[#E5E7EB] dark:border-slate-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-[#E5E7EB] dark:border-slate-700 bg-white dark:bg-slate-800">
                    <tr>
                      <th className="px-6 py-4 text-left text-[14px] font-medium text-[#4B5563] dark:text-slate-400">
                        Name
                      </th>
                      <th className="px-6 py-4 text-left text-[14px] font-medium text-[#4B5563] dark:text-slate-400">
                        Email
                      </th>
                      <th className="px-6 py-4 text-left text-[14px] font-medium text-[#4B5563] dark:text-slate-400">
                        Role
                      </th>
                      <th className="px-6 py-4 text-right text-[14px] font-medium text-[#4B5563] dark:text-slate-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] dark:divide-slate-700">
                    {activeUsers.map((user: any) => (
                      <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                        <td className="px-6 py-4 text-[#111827] dark:text-slate-200 font-medium">
                          {user.firstName && user.lastName
                            ? `${user.firstName} ${user.lastName}`
                            : user.email || '—'}
                        </td>
                        <td className="px-6 py-4 text-[#6B7280] dark:text-slate-400">
                          {user.email}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-3 py-1 rounded-full text-[12px] font-bold ${getRoleBadgeStyle(
                              user.role
                            )}`}
                          >
                            {getRoleLabel(user.role)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                          {canResetPassword(user.role) && (
                            <button
                              className="p-2 text-[#6B7280] dark:text-slate-400 hover:text-[#1D4ED8] dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                              title="Manage login credentials"
                              onClick={() => handleOpenEditCredentials(user)}
                            >
                              <Key size={18} />
                            </button>
                          )}
                          {canDeleteUser(user.role) && (
                            <button
                              className="p-2 text-[#6B7280] dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors"
                              title="Delete user"
                              onClick={() => {
                                setDeleteConfirm({
                                  userId: user.id,
                                  userName: `${user.firstName} ${user.lastName}`,
                                });
                              }}
                            >
                              <Trash2 size={18} />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Team Member Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-[#E5E7EB] dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
              <h2 className="text-[20px] font-semibold text-[#111827] dark:text-white">Add Team Member</h2>
              <button
                onClick={handleCloseModal}
                className="text-[#9CA3AF] hover:text-[#4B5563] dark:hover:text-slate-400 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Error Message */}
              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded text-[13px]">
                  {formError}
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-[14px] font-medium text-[#111827] dark:text-white mb-2">
                  Full Name
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="First Name"
                    className="flex-1 px-4 py-2.5 border border-[#E5E7EB] dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-[#111827] dark:text-white placeholder:text-[#9CA3AF] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Last Name"
                    className="flex-1 px-4 py-2.5 border border-[#E5E7EB] dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-[#111827] dark:text-white placeholder:text-[#9CA3AF] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[14px] font-medium text-[#111827] dark:text-white mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="email@example.com"
                  className="w-full px-4 py-2.5 border border-[#E5E7EB] dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-[#111827] dark:text-white placeholder:text-[#9CA3AF] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Temporary Password */}
              <div>
                <label className="block text-[14px] font-medium text-[#111827] dark:text-white mb-2">
                  Temporary Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Min 6 characters"
                  className="w-full px-4 py-2.5 border border-[#E5E7EB] dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-[#111827] dark:text-white placeholder:text-[#9CA3AF] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-[14px] font-medium text-[#111827] dark:text-white mb-2">
                  Role
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2.5 border border-[#E5E7EB] dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-[#111827] dark:text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  {ROLE_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-[13px] text-[#6B7280] dark:text-slate-400 mt-2">
                  {ROLE_DESCRIPTIONS[formData.role]}
                </p>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-[14px] font-medium text-[#111827] dark:text-white mb-2">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="e.g. 555-1234"
                  className="w-full px-4 py-2.5 border border-[#E5E7EB] dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-[#111827] dark:text-white placeholder:text-[#9CA3AF] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Pay Percentage */}
              <div>
                <label className="block text-[14px] font-medium text-[#111827] dark:text-white mb-2">
                  Pay Percentage (% of load rate)
                </label>
                <input
                  type="number"
                  name="payPercentage"
                  value={formData.payPercentage}
                  onChange={handleInputChange}
                  placeholder="e.g. 5"
                  step="0.1"
                  min="0"
                  max="100"
                  className="w-full px-4 py-2.5 border border-[#E5E7EB] dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-[#111827] dark:text-white placeholder:text-[#9CA3AF] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full px-4 py-2.5 bg-[#1D4ED8] text-white rounded-md font-medium text-[14px] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-6"
              >
                {isSubmitting ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-sm">
            {/* Header */}
            <div className="flex items-center gap-3 p-6 border-b border-[#E5E7EB] dark:border-slate-700">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center">
                <Trash2 className="text-red-600 dark:text-red-400" size={24} />
              </div>
              <div>
                <h3 className="text-[16px] font-semibold text-[#111827] dark:text-white">Delete User</h3>
                <p className="text-[14px] text-[#6B7280] dark:text-slate-400 mt-1">This action cannot be undone</p>
              </div>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="text-[14px] text-[#6B7280] dark:text-slate-400 mb-4">
                Are you sure you want to delete <strong>{deleteConfirm.userName}</strong>? All associated data will be removed.
              </p>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-[#E5E7EB] dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleteUser.isPending}
                className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-700 border border-[#E5E7EB] dark:border-slate-600 text-[#111827] dark:text-white rounded-md font-medium text-[14px] hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deleteUser.isPending}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-md font-medium text-[14px] hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleteUser.isPending ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Login Credentials Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-[#E5E7EB] dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
              <div>
                <h2 className="text-[20px] font-semibold text-[#111827] dark:text-white">
                  Manage Login — {editingUser.firstName} {editingUser.lastName}
                </h2>
                <p className="text-[14px] text-[#6B7280] dark:text-slate-400 mt-1">
                  Update the login email or reset the password for this user.
                </p>
              </div>
              <button
                onClick={handleCloseEditCredentials}
                className="text-[#9CA3AF] hover:text-[#4B5563] dark:hover:text-slate-400 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleUpdateCredentials} className="p-6 space-y-5">
              {/* Error Message */}
              {editCredentialsError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded text-[13px]">
                  {editCredentialsError}
                </div>
              )}

              {/* Login Email */}
              <div>
                <label className="block text-[14px] font-medium text-[#111827] dark:text-white mb-2">
                  Login Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={credentialsFormData.email}
                  onChange={handleCredentialsInputChange}
                  placeholder="email@example.com"
                  className="w-full px-4 py-2.5 border border-[#E5E7EB] dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-[#111827] dark:text-white placeholder:text-[#9CA3AF] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* New Password */}
              <div>
                <label className="block text-[14px] font-medium text-[#111827] dark:text-white mb-2">
                  New Password
                </label>
                <input
                  type="password"
                  name="password"
                  value={credentialsFormData.password}
                  onChange={handleCredentialsInputChange}
                  placeholder="Leave blank to keep current"
                  className="w-full px-4 py-2.5 border border-[#E5E7EB] dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-[#111827] dark:text-white placeholder:text-[#9CA3AF] focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isEditingCredentials}
                className="w-full px-4 py-2.5 bg-[#1D4ED8] text-white rounded-md font-medium text-[14px] hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-6 flex items-center justify-center gap-2"
              >
                <Key size={16} />
                {isEditingCredentials ? 'Updating...' : 'Update Credentials'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamPage;
