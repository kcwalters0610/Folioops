import React, { useState, useEffect } from 'react';
import { Plus, Search, Mail, Phone, Edit, Trash2, Users, UserCheck, UserX, Key, Copy, Eye, EyeOff } from 'lucide-react';
import { supabase, Profile } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const EmployeeList: React.FC = () => {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Profile | null>(null);

  useEffect(() => {
    if (profile?.company_id) {
      fetchEmployees();
    }
  }, [profile]);

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('company_id', profile?.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = `${employee.first_name} ${employee.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.phone?.includes(searchTerm);
    
    const matchesRole = roleFilter === 'all' || employee.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'manager':
        return 'bg-blue-100 text-blue-800';
      case 'tech':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setShowModal(true);
  };

  const handleEditEmployee = (employee: Profile) => {
    setEditingEmployee(employee);
    setShowModal(true);
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (employeeId === profile?.id) {
      alert('You cannot delete your own account.');
      return;
    }

    if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', employeeId);

      if (error) throw error;
      await fetchEmployees();
    } catch (error) {
      console.error('Error deleting employee:', error);
    }
  };

  const handleToggleStatus = async (employee: Profile) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !employee.is_active })
        .eq('id', employee.id);

      if (error) throw error;
      await fetchEmployees();
    } catch (error) {
      console.error('Error updating employee status:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-primary">Employees</h1>
          <p className="text-text-secondary mt-1">Manage your team members and their roles</p>
        </div>
        {profile?.role === 'admin' && (
          <button
            onClick={handleAddEmployee}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Employee</span>
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="input-field w-auto"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="tech">Technician</option>
        </select>
      </div>

      {/* Employees Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEmployees.map((employee) => (
          <div key={employee.id} className="card p-6 group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-lg font-semibold text-white">
                      {employee.first_name.charAt(0)}{employee.last_name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-primary">
                      {employee.first_name} {employee.last_name}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getRoleColor(employee.role)}`}>
                        {employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
                      </span>
                      <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                        employee.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {employee.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              {profile?.role === 'admin' && (
                <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => handleToggleStatus(employee)}
                    className={`p-2 rounded-folioops transition-all duration-200 ${
                      employee.is_active
                        ? 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                        : 'text-gray-400 hover:text-green-500 hover:bg-green-50'
                    }`}
                    title={employee.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {employee.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => handleEditEmployee(employee)}
                    className="p-2 text-gray-400 hover:text-accent hover:bg-accent/10 rounded-folioops transition-all duration-200"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  {employee.id !== profile?.id && (
                    <button
                      onClick={() => handleDeleteEmployee(employee.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-folioops transition-all duration-200"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center space-x-3 text-text-primary">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{employee.email}</span>
              </div>
              {employee.phone && (
                <div className="flex items-center space-x-3 text-text-primary">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{employee.phone}</span>
                </div>
              )}
            </div>

            {employee.id === profile?.id && (
              <div className="mt-4 p-3 bg-blue-50 rounded-folioops">
                <p className="text-sm text-blue-700 font-medium">This is your account</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredEmployees.length === 0 && (
        <div className="text-center py-12">
          <Users className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-primary">No employees found</h3>
          <p className="mt-2 text-sm text-text-secondary">
            {searchTerm || roleFilter !== 'all' ? 'Try adjusting your filters.' : 'Get started by adding your first team member.'}
          </p>
          {!searchTerm && roleFilter === 'all' && profile?.role === 'admin' && (
            <button
              onClick={handleAddEmployee}
              className="mt-4 btn-primary"
            >
              Add Employee
            </button>
          )}
        </div>
      )}

      {showModal && (
        <EmployeeModal
          employee={editingEmployee}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            fetchEmployees();
          }}
        />
      )}
    </div>
  );
};

// Employee Modal Component
interface EmployeeModalProps {
  employee: Profile | null;
  onClose: () => void;
  onSave: () => void;
}

const EmployeeModal: React.FC<EmployeeModalProps> = ({ employee, onClose, onSave }) => {
  const { profile } = useAuth();
  const [formData, setFormData] = useState({
    first_name: employee?.first_name || '',
    last_name: employee?.last_name || '',
    email: employee?.email || '',
    phone: employee?.phone || '',
    role: employee?.role || 'tech',
    is_active: employee?.is_active ?? true,
    password: '',
    generate_password: false,
  });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setGeneratedPassword(password);
    setFormData({ ...formData, password: password, generate_password: true });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (employee) {
        // Update existing employee
        const { error } = await supabase
          .from('profiles')
          .update({
            first_name: formData.first_name,
            last_name: formData.last_name,
            phone: formData.phone,
            role: formData.role,
            is_active: formData.is_active,
          })
          .eq('id', employee.id);
        
        if (error) throw error;
        setSuccessMessage('Employee updated successfully!');
      } else {
        // Create new employee - improved email validation
        const emailValue = String(formData.email || '').trim();
        
        // Check if email is empty or null
        if (!emailValue) {
          alert('Email is required for new employees');
          setLoading(false);
          return;
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailValue)) {
          alert('Please enter a valid email address');
          setLoading(false);
          return;
        }

        if (!formData.password) {
          alert('Password is required for new employees');
          setLoading(false);
          return;
        }

        // Ensure we're passing a valid string, not null or undefined
        const { data, error } = await supabase.rpc('create_user_for_company', {
          user_email: emailValue,
          user_password: formData.password,
          first_name: formData.first_name,
          last_name: formData.last_name,
          user_role: formData.role,
          phone_number: formData.phone || null,
        });

        if (error) throw error;

        if (!data.success) {
          throw new Error(data.error);
        }

        setSuccessMessage(`Employee created successfully! ${formData.generate_password ? 'Password: ' + formData.password : ''}`);
      }

      setShowSuccess(true);
      setTimeout(() => {
        onSave();
      }, 2000);
    } catch (error: any) {
      console.error('Error saving employee:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-folioops-lg max-w-md w-full p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCheck className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-primary mb-2">Success!</h3>
            <p className="text-text-secondary mb-4">{successMessage}</p>
            
            {formData.generate_password && !employee && (
              <div className="bg-gray-50 rounded-folioops p-4 mb-4">
                <p className="text-sm font-medium text-primary mb-2">Login Credentials:</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Email:</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-mono">{formData.email}</span>
                      <button
                        onClick={() => copyToClipboard(formData.email)}
                        className="p-1 text-gray-400 hover:text-primary"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">Password:</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-mono">{formData.password}</span>
                      <button
                        onClick={() => copyToClipboard(formData.password)}
                        className="p-1 text-gray-400 hover:text-primary"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-orange-600 mt-2">
                  Please save these credentials securely and share them with the employee.
                </p>
              </div>
            )}
            
            <button
              onClick={onSave}
              className="btn-primary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-folioops-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-h2 text-primary">
            {employee ? 'Edit Employee' : 'Add New Employee'}
          </h2>
          {!employee && (
            <p className="text-sm text-text-secondary mt-1">
              Create a new user account for your team member
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                First Name *
              </label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Email *
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="input-field"
              disabled={!!employee}
            />
            {employee && (
              <p className="text-xs text-text-secondary mt-1">Email cannot be changed for existing employees</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Role *
            </label>
            <select
              required
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="input-field"
            >
              <option value="tech">Technician</option>
              <option value="manager">Manager</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {!employee && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
                  Password *
                </label>
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={generatePassword}
                      className="btn-secondary flex items-center space-x-2"
                    >
                      <Key className="h-4 w-4" />
                      <span>Generate Password</span>
                    </button>
                  </div>
                  
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value, generate_password: false })}
                      className="input-field pr-10"
                      placeholder="Enter password or generate one"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {formData.password && (
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-text-secondary">Password strength:</span>
                      <div className={`text-xs font-medium ${
                        formData.password.length >= 8 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formData.password.length >= 8 ? 'Good' : 'Too short'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-primary">Active Employee</span>
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? 'Saving...' : employee ? 'Update Employee' : 'Create Employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeList;