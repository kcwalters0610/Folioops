import React, { useState, useEffect } from 'react';
import { Plus, Search, Phone, Mail, MapPin, Edit, Trash2, Truck, Building } from 'lucide-react';
import { supabase, Vendor } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const VendorList: React.FC = () => {
  const { profile, hasRole } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  // Check if user can manage vendors (admin/manager) or just view (tech)
  const canManageVendors = hasRole(['admin', 'manager']);

  useEffect(() => {
    if (profile?.company_id) {
      fetchVendors();
    }
  }, [profile]);

  const fetchVendors = async () => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .eq('company_id', profile?.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVendors(data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVendors = vendors.filter(vendor =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.contact_person?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    vendor.vendor_type?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddVendor = () => {
    if (!canManageVendors) {
      alert('You do not have permission to add vendors.');
      return;
    }
    setEditingVendor(null);
    setShowModal(true);
  };

  const handleEditVendor = (vendor: Vendor) => {
    if (!canManageVendors) {
      alert('You do not have permission to edit vendors.');
      return;
    }
    setEditingVendor(vendor);
    setShowModal(true);
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (!canManageVendors) {
      alert('You do not have permission to delete vendors.');
      return;
    }

    if (!confirm('Are you sure you want to delete this vendor?')) return;

    try {
      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', vendorId);

      if (error) throw error;
      await fetchVendors();
    } catch (error) {
      console.error('Error deleting vendor:', error);
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
          <h1 className="text-h1 text-primary">Vendors</h1>
          <p className="text-text-secondary mt-1">
            {canManageVendors ? 'Manage your vendor relationships' : 'View vendor information'}
          </p>
        </div>
        {canManageVendors && (
          <button
            onClick={handleAddVendor}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Vendor</span>
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <input
          type="text"
          placeholder="Search vendors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input-field pl-10"
        />
      </div>

      {/* Vendor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredVendors.map((vendor) => (
          <div key={vendor.id} className="card p-6 group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-primary mb-2">
                  {vendor.name}
                </h3>
                <div className="flex items-center space-x-2 mb-2">
                  <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${
                    vendor.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {vendor.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {vendor.vendor_type && (
                    <span className="inline-block px-3 py-1 text-xs font-medium rounded-full bg-accent/10 text-accent">
                      {vendor.vendor_type}
                    </span>
                  )}
                </div>
              </div>
              {canManageVendors && (
                <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={() => handleEditVendor(vendor)}
                    className="p-2 text-gray-400 hover:text-accent hover:bg-accent/10 rounded-folioops transition-all duration-200"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteVendor(vendor.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-folioops transition-all duration-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {vendor.contact_person && (
                <div className="flex items-center space-x-3 text-text-primary">
                  <Building className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{vendor.contact_person}</span>
                </div>
              )}
              {vendor.email && (
                <div className="flex items-center space-x-3 text-text-primary">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{vendor.email}</span>
                </div>
              )}
              {vendor.phone && (
                <div className="flex items-center space-x-3 text-text-primary">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{vendor.phone}</span>
                </div>
              )}
              {vendor.address && (
                <div className="flex items-start space-x-3 text-text-primary">
                  <MapPin className="h-4 w-4 text-gray-400 mt-0.5" />
                  <span className="text-sm">
                    {vendor.address}
                    {vendor.city && `, ${vendor.city}`}
                    {vendor.state && `, ${vendor.state}`}
                    {vendor.zip_code && ` ${vendor.zip_code}`}
                  </span>
                </div>
              )}
            </div>

            {vendor.notes && (
              <div className="mt-4 p-3 bg-gray-50 rounded-folioops">
                <p className="text-sm text-text-secondary">{vendor.notes}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredVendors.length === 0 && (
        <div className="text-center py-12">
          <Truck className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-medium text-primary">No vendors found</h3>
          <p className="mt-2 text-sm text-text-secondary">
            {searchTerm ? 'Try adjusting your search terms.' : 'No vendors available.'}
          </p>
          {!searchTerm && canManageVendors && (
            <button
              onClick={handleAddVendor}
              className="mt-4 btn-primary"
            >
              Add Vendor
            </button>
          )}
        </div>
      )}

      {showModal && canManageVendors && (
        <VendorModal
          vendor={editingVendor}
          onClose={() => setShowModal(false)}
          onSave={() => {
            setShowModal(false);
            fetchVendors();
          }}
        />
      )}
    </div>
  );
};

// Vendor Modal Component
interface VendorModalProps {
  vendor: Vendor | null;
  onClose: () => void;
  onSave: () => void;
}

const VendorModal: React.FC<VendorModalProps> = ({ vendor, onClose, onSave }) => {
  const { profile } = useAuth();
  const [formData, setFormData] = useState({
    name: vendor?.name || '',
    contact_person: vendor?.contact_person || '',
    email: vendor?.email || '',
    phone: vendor?.phone || '',
    address: vendor?.address || '',
    city: vendor?.city || '',
    state: vendor?.state || '',
    zip_code: vendor?.zip_code || '',
    vendor_type: vendor?.vendor_type || '',
    notes: vendor?.notes || '',
    is_active: vendor?.is_active ?? true,
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (vendor) {
        // Update vendor
        const { error } = await supabase
          .from('vendors')
          .update(formData)
          .eq('id', vendor.id);
        if (error) throw error;
      } else {
        // Create vendor
        const { error } = await supabase
          .from('vendors')
          .insert({
            ...formData,
            company_id: profile?.company_id,
          });
        if (error) throw error;
      }
      onSave();
    } catch (error) {
      console.error('Error saving vendor:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-folioops-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-h2 text-primary">
            {vendor ? 'Edit Vendor' : 'Add New Vendor'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Vendor Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Contact Person
              </label>
              <input
                type="text"
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Vendor Type
              </label>
              <input
                type="text"
                value={formData.vendor_type}
                onChange={(e) => setFormData({ ...formData, vendor_type: e.target.value })}
                className="input-field"
                placeholder="e.g., Parts Supplier, Equipment Rental"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-field"
              />
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
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                City
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                State
              </label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-2">
                ZIP Code
              </label>
              <input
                type="text"
                value={formData.zip_code}
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded border-gray-300 text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium text-primary">Active Vendor</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-primary mb-2">
              Notes
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input-field"
            />
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
              {loading ? 'Saving...' : 'Save Vendor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VendorList;