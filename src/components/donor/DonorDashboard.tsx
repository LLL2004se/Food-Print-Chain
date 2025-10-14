import React, { useState, useEffect } from 'react';
import { supabase, FoodListing, Claim } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Package, Clock, CheckCircle, XCircle } from 'lucide-react';
import { CreateListingForm } from './CreateListingForm';

export const DonorDashboard: React.FC = () => {
  const { profile } = useAuth();
  const [listings, setListings] = useState<FoodListing[]>([]);
  const [claims, setClaims] = useState<Record<string, Claim[]>>({});
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadListings();
  }, [profile]);

  const loadListings = async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('food_listings')
        .select('*')
        .eq('donor_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data || []);

      for (const listing of data || []) {
        loadClaims(listing.id);
      }
    } catch (error) {
      console.error('Error loading listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClaims = async (listingId: string) => {
    try {
      const { data, error } = await supabase
        .from('claims')
        .select(`
          *,
          ngo:profiles!claims_ngo_id_fkey(*)
        `)
        .eq('listing_id', listingId);

      if (error) throw error;
      setClaims((prev) => ({ ...prev, [listingId]: data || [] }));
    } catch (error) {
      console.error('Error loading claims:', error);
    }
  };

  const handleAcceptClaim = async (claimId: string, listingId: string) => {
    try {
      await supabase
        .from('claims')
        .update({ status: 'accepted' })
        .eq('id', claimId);

      await supabase
        .from('food_listings')
        .update({ status: 'claimed' })
        .eq('id', listingId);

      loadListings();
    } catch (error) {
      console.error('Error accepting claim:', error);
    }
  };

  const handleRejectClaim = async (claimId: string) => {
    try {
      await supabase
        .from('claims')
        .update({ status: 'rejected' })
        .eq('id', claimId);

      loadClaims(claims[claimId]?.[0]?.listing_id);
    } catch (error) {
      console.error('Error rejecting claim:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'claimed':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  if (showCreateForm) {
    return (
      <CreateListingForm
        onCancel={() => setShowCreateForm(false)}
        onSuccess={() => {
          setShowCreateForm(false);
          loadListings();
        }}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">My Food Listings</h1>
          <p className="text-gray-600 mt-1">Manage your surplus food donations</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Listing
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      ) : listings.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No listings yet</h3>
          <p className="text-gray-500 mb-6">Create your first food listing to get started</p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Create Listing
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {listings.map((listing) => (
            <div key={listing.id} className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">{listing.title}</h3>
                    <p className="text-gray-600 mt-1">{listing.description}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(listing.status)}`}>
                    {listing.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Quantity</p>
                    <p className="font-medium">{listing.quantity}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Type</p>
                    <p className="font-medium">{listing.food_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Expiry</p>
                    <p className="font-medium">{new Date(listing.expiry_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pickup Window</p>
                    <p className="font-medium text-sm">
                      {new Date(listing.pickup_time_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                      {new Date(listing.pickup_time_end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                {claims[listing.id] && claims[listing.id].length > 0 && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-semibold text-gray-800 mb-3">Claims ({claims[listing.id].length})</h4>
                    <div className="space-y-3">
                      {claims[listing.id].map((claim) => (
                        <div key={claim.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <p className="font-medium text-gray-800">{claim.ngo?.organization_name}</p>
                              <p className="text-sm text-gray-600 mt-1">{claim.message}</p>
                              <p className="text-xs text-gray-500 mt-2">
                                <Clock className="w-3 h-3 inline mr-1" />
                                {new Date(claim.claimed_at).toLocaleString()}
                              </p>
                            </div>
                            {claim.status === 'pending' && listing.status === 'available' && (
                              <div className="flex gap-2 ml-4">
                                <button
                                  onClick={() => handleAcceptClaim(claim.id, listing.id)}
                                  className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Accept
                                </button>
                                <button
                                  onClick={() => handleRejectClaim(claim.id)}
                                  className="flex items-center gap-1 bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                                >
                                  <XCircle className="w-4 h-4" />
                                  Reject
                                </button>
                              </div>
                            )}
                            {claim.status !== 'pending' && (
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                claim.status === 'accepted' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {claim.status}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
