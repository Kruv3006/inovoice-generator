
"use client";

import type { CompanyProfileData, ClientData, SavedItemData, AvailableCurrency } from './invoice-types';
import { availableCurrencies } from './invoice-types';

const COMPANY_PROFILE_KEY = 'companyProfileData_v2'; // Incremented version
const CLIENT_LIST_KEY = 'clientListData_v2'; // Incremented version
const SAVED_ITEMS_KEY = 'savedItemsData_v1'; // No change here yet for direct fields

// Company Profile
export const saveCompanyProfile = (data: CompanyProfileData): void => {
  if (typeof window !== 'undefined') {
    const profileToSave: CompanyProfileData = {
      ...data,
      defaultTemplateStyle: data.defaultTemplateStyle || 'classic',
      currency: data.currency || availableCurrencies[0], // Default to INR
      showClientAddressOnInvoice: data.showClientAddressOnInvoice === undefined ? true : data.showClientAddressOnInvoice,
    };
    localStorage.setItem(COMPANY_PROFILE_KEY, JSON.stringify(profileToSave));
  }
};

export const getCompanyProfile = (): CompanyProfileData | null => {
  if (typeof window !== 'undefined') {
    const dataString = localStorage.getItem(COMPANY_PROFILE_KEY);
    if (dataString) {
      const profile = JSON.parse(dataString) as CompanyProfileData;
      return {
        ...profile,
        defaultTemplateStyle: profile.defaultTemplateStyle || 'classic',
        currency: profile.currency || availableCurrencies[0],
        showClientAddressOnInvoice: profile.showClientAddressOnInvoice === undefined ? true : profile.showClientAddressOnInvoice,
      };
    }
    return { // Return a default profile if none exists
        companyName: '',
        companyLogoDataUrl: null,
        defaultInvoiceNotes: '',
        defaultTermsAndConditions: '',
        defaultTemplateStyle: 'classic',
        currency: availableCurrencies[0],
        showClientAddressOnInvoice: true,
    };
  }
  return null;
};

// Client List
export const getClients = (): ClientData[] => {
  if (typeof window !== 'undefined') {
    const dataString = localStorage.getItem(CLIENT_LIST_KEY);
    return dataString ? JSON.parse(dataString) : [];
  }
  return [];
};

export const saveClients = (clients: ClientData[]): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(CLIENT_LIST_KEY, JSON.stringify(clients));
  }
};

export const addClient = (clientData: Omit<ClientData, 'id'>): ClientData[] => {
  const clients = getClients();
  const newClient = { ...clientData, id: `client_${Date.now()}` };
  const updatedClients = [...clients, newClient];
  saveClients(updatedClients);
  return updatedClients;
};

export const updateClient = (updatedClient: ClientData): ClientData[] => {
  let clients = getClients();
  clients = clients.map(client => client.id === updatedClient.id ? updatedClient : client);
  saveClients(clients);
  return clients;
};


export const removeClient = (id: string): ClientData[] => {
  let clients = getClients();
  clients = clients.filter(client => client.id !== id);
  saveClients(clients);
  return clients;
};

// Saved Items
export const getSavedItems = (): SavedItemData[] => {
  if (typeof window !== 'undefined') {
    const dataString = localStorage.getItem(SAVED_ITEMS_KEY);
    if (dataString) {
      const items = JSON.parse(dataString) as SavedItemData[];
      return items.map(item => ({
        ...item,
        defaultQuantity: item.defaultQuantity != null ? Number(item.defaultQuantity) : undefined,
        defaultUnit: item.defaultUnit != null ? String(item.defaultUnit) : undefined,
      }));
    }
    return [];
  }
  return [];
};

export const saveSavedItems = (items: SavedItemData[]): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SAVED_ITEMS_KEY, JSON.stringify(items));
  }
};

export const addSavedItem = (description: string, rate: number, defaultQuantity?: number, defaultUnit?: string): SavedItemData[] => {
  const items = getSavedItems();
  const newItem: SavedItemData = {
    id: `item_${Date.now()}`,
    description,
    rate,
    defaultQuantity: defaultQuantity != null ? Number(defaultQuantity) : undefined,
    defaultUnit: defaultUnit != null ? String(defaultUnit) : undefined,
  };
  const updatedItems = [...items, newItem];
  saveSavedItems(updatedItems);
  return updatedItems;
};

export const removeSavedItem = (id: string): SavedItemData[] => {
  let items = getSavedItems();
  items = items.filter(item => item.id !== id);
  saveSavedItems(items);
  return items;
};

    