import { createClient } from '@supabase/supabase-js'
import { generateId } from './generateId';

export async function registerPush(userId, skipPermissionCheck = false) {
    if (!userId) {
        throw new Error('User ID is required');
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

    try {
        // Check browser support
        if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
            throw new Error('Browser tidak mendukung push notifications');
        }

        // register service worker
        const registration = await navigator.serviceWorker.register('/swPushNotification.js');
        await navigator.serviceWorker.ready;

        // minta izin notifikasi (skip jika sudah di-handle di UI)
        if (!skipPermissionCheck) {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                throw new Error('Permission ditolak oleh user');
            }
        } else {
            // Validate permission jika skip check
            if (Notification.permission !== 'granted') {
                throw new Error('Permission belum diberikan');
            }
        }

        // Check if already subscribed
        const existingSubscription = await registration.pushManager.getSubscription();
        if (existingSubscription) {
            return { success: true, message: 'Sudah berlangganan' };
        }

        // Validate VAPID key
        if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
            throw new Error('VAPID public key not configured');
        }

        // subscribe ke push manager
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        });

        const { endpoint, keys } = subscription.toJSON();

        // Validate subscription data
        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            throw new Error('Invalid subscription data');
        }

        // Generate device identifier berdasarkan endpoint untuk membedakan device
        const deviceIdentifier = btoa(endpoint).substring(0, 32); // Base64 hash dari endpoint, ambil 32 karakter pertama
        
        // Check apakah sudah ada subscription untuk endpoint yang sama (device yang sama)
        const {data: existingSubscriptionData} = await supabase
            .from('user_push_subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('endpoint', endpoint)
            .maybeSingle();

        // ✅ Log untuk debugging
        console.log('Checking existing subscription for user:', userId, 'device:', deviceIdentifier);

        if (existingSubscriptionData) {
            // Update subscription yang sudah ada untuk device yang sama
            const {data: updatedSubscriptionData, error: updatedSubscriptionError} = await supabase
                .from('user_push_subscriptions')
                .update({
                    p256dh: keys.p256dh,
                    auth: keys.auth,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingSubscriptionData.id)
                .select();
                
            if (updatedSubscriptionError) {
                console.error('Update subscription error:', updatedSubscriptionError);
                throw new Error(`Gagal mengupdate subscription: ${updatedSubscriptionError.message}`);
            }
            
            console.log('✅ Subscription updated successfully:', updatedSubscriptionData);
            return { success: true, data: updatedSubscriptionData, message: 'Subscription berhasil diperbarui' };
        } else {
            // Insert subscription baru untuk device baru
            console.log('Creating new subscription for user:', userId, 'device:', deviceIdentifier);
            const { data, error } = await supabase
                .from('user_push_subscriptions')
                .insert({
                    id: generateId(),
                    user_id: userId,
                    endpoint,
                    p256dh: keys.p256dh,
                    auth: keys.auth,
                    created_at: new Date().toISOString()
                })
                .select();
    
            if (error) {
                console.error('Insert subscription error:', error);
                throw new Error(`Gagal menyimpan subscription: ${error.message}`);
            }
    
            console.log('✅ New subscription created successfully:', data);
            return { success: true, data, message: 'Notifikasi berhasil diaktifkan' };
        }



    } catch (error) {
        console.error('registerPush error:', error);
        throw error; // Re-throw untuk handling di UI
    }
}
