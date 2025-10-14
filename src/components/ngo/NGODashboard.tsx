import React, { useState, useEffect } from 'react';
import { supabase, FoodListing, Claim } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Package, MapPin, Clock, Calendar } from 'lucide-react';

export const NGODashboard: React.FC = () => {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'available' | 'my-claims'>('available');
  const [listings, setListings] = useState<FoodListing[]>([]);
  const [myClaims, setMyClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<FoodListing | null>(null);
  const [claimMessage, setClaimMessage] = useState('');

  useEffect(() => {
    loadData();
  }, [profile, activeTab]);

  const loadData = async () => {
    if (!profile) return;

    setLoading(true);
    try {
      if (activeTab === 'available') {
        await loadAvailableListings();
      } else {
        await loadMyClaims();
      }
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableListings = async () => {
    const { data, error } = await supabase
      .from('food_listings')
      .select(`
        *,
        donor:profiles!food_listings_donor_id_fkey(*)
      `)
      .eq('status', 'available')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading listings:', error);
      return;
    }

    setListings(data || []);
  };

  const loadMyClaims = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('claims')
      .select(`
        *,
        listing:food_listings!claims_listing_id_fkey(
          *,
          donor:profiles!food_listings_donor_id_fkey(*)
        )
      `)
      .eq('ngo_id', profile.id)
      .order('claimed_at', { ascending: false });

    if (error) {
      console.error('Error loading claims:', error);
      return;
    }

    setMyClaims(data || []);
  };

  const handleClaimFood = async () => {
    if (!profile || !selectedListing) return;

    try {
      const { error } = await supabase
        .from('claims')
        .insert({
          listing_id: selectedListing.id,
          ngo_id: profile.id,
          message: claimMessage,
          status: 'pending',
        });

      if (error) throw error;

      setSelectedListing(null);
      setClaimMessage('');
      loadData();
    } catch (error) {
      console.error('Error claiming food:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-gray-100 text-gray-800',
    };
    return styles[status as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Food Listings</h1>
        <p className="text-gray-600 mt-1">Browse and claim available food donations</p>
      </div>

      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('available')}
          className={`pb-3 px-4 font-medium transition-colors ${
            activeTab === 'available'
              ? 'border-b-2 border-green-600 text-green-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Available Food
        </button>
        <button
          onClick={() => setActiveTab('my-claims')}
          className={`pb-3 px-4 font-medium transition-colors ${
            activeTab === 'my-claims'
              ? 'border-b-2 border-green-600 text-green-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          My Claims
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        </div>
      ) : activeTab === 'available' ? (
        listings.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No available listings</h3>
            <p className="text-gray-500">Check back later for new food donations</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-6">
            {listings.map((listing) => (
              <div key={listing.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">{listing.title}</h3>
                  <p className="text-gray-600 mb-4">{listing.description}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-700">
                      <Package className="w-4 h-4 mr-2 text-green-600" />
                      <span className="font-medium mr-2">Quantity:</span>
                      {listing.quantity}
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <Calendar className="w-4 h-4 mr-2 text-green-600" />
                      <span className="font-medium mr-2">Type:</span>
                      {listing.food_type}
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <Clock className="w-4 h-4 mr-2 text-green-600" />
                      <span className="font-medium mr-2">Pickup:</span>
                      {new Date(listing.pickup_time_start).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })} - {new Date(listing.pickup_time_end).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <div className="flex items-center text-sm text-gray-700">
                      <MapPin className="w-4 h-4 mr-2 text-green-600" />
                      <span className="font-medium mr-2">Location:</span>
                      {listing.donor?.organization_name}
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedListing(listing)}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Claim This Food
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        myClaims.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No claims yet</h3>
            <p className="text-gray-500">Start claiming food to see your requests here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {myClaims.map((claim) => (
              <div key={claim.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">{claim.listing?.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{claim.listing?.donor?.organization_name}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(claim.status)}`}>
                    {claim.status}
                  </span>
                </div>

                <p className="text-gray-700 mb-4">{claim.listing?.description}</p>

                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div>
                    <span className="text-gray-600">Quantity:</span>
                    <span className="ml-2 font-medium">{claim.listing?.quantity}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <span className="ml-2 font-medium">{claim.listing?.food_type}</span>
                  </div>
                </div>

                {claim.message && (
                  <div className="bg-gray-50 rounded p-3 mt-4">
                    <p className="text-sm text-gray-600">Your message:</p>
                    <p className="text-gray-800 mt-1">{claim.message}</p>
                  </div>
                )}

                {claim.status === 'accepted' && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="font-medium text-green-800 mb-2">Contact Details:</p>
                    <p className="text-sm text-gray-700">Phone: {claim.listing?.donor?.phone}</p>
                    <p className="text-sm text-gray-700">Address: {claim.listing?.donor?.address}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}

      {selectedListing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Claim Food</h3>
            <p className="text-gray-700 mb-4">{selectedListing.title}</p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message to Donor (Optional)
              </label>
              <textarea
                value={claimMessage}
                onChange={(e) => setClaimMessage(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={4}
                placeholder="Let the donor know why you need this food or any special requirements..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedListing(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClaimFood}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                Submit Claim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
