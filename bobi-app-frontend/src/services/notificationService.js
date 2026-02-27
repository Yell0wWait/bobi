// Service de notifications push
import { supabase } from './supabaseClient'

class NotificationService {
  constructor() {
    this.permission = 'default'
    this.subscription = null
  }

  // Demander la permission pour les notifications
  async requestPermission() {
    if (!('Notification' in window)) {
      console.log('Ce navigateur ne supporte pas les notifications')
      return false
    }

    const permission = await Notification.requestPermission()
    this.permission = permission
    return permission === 'granted'
  }

  // Envoyer une notification
  sendNotification(title, options = {}) {
    if (this.permission === 'granted') {
      new Notification(title, {
        icon: '/vite.svg',
        badge: '/vite.svg',
        ...options
      })
    }
  }

  // S'abonner aux changements de commandes (pour admin)
  subscribeToOrders(callback) {
    if (this.subscription) {
      this.unsubscribe()
    }

    this.subscription = supabase
      .channel('commandes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'commandes'
        },
        (payload) => {
          console.log('Changement détecté:', payload)
          
          if (payload.eventType === 'INSERT') {
            this.sendNotification('Nouvelle commande!', {
              body: `Une nouvelle commande a été passée`,
              tag: 'new-order',
              requireInteraction: true
            })
          } else if (payload.eventType === 'UPDATE') {
            const statut = payload.new.statut
            this.sendNotification('Commande mise à jour', {
              body: `Statut: ${statut}`,
              tag: 'order-update'
            })
          }
          
          if (callback) callback(payload)
        }
      )
      .subscribe()

    return this.subscription
  }

  // Se désabonner
  unsubscribe() {
    if (this.subscription) {
      supabase.removeChannel(this.subscription)
      this.subscription = null
    }
  }
}

export const notificationService = new NotificationService()
