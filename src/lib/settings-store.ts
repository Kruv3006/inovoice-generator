
"use client";

import type { CompanyProfileData, ClientData, SavedItemData } from './invoice-types';

const COMPANY_PROFILE_KEY = 'companyProfileData_v1';
const CLIENT_LIST_KEY = 'clientListData_v1';
const SAVED_ITEMS_KEY = 'savedItemsData_v1';

// Company Profile
export const saveCompanyProfile = (data: CompanyProfileData): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(COMPANY_PROFILE_KEY, JSON.stringify(data));
  }
};

export const getCompanyProfile = (): CompanyProfileData | null => {
  if (typeof window !== 'undefined') {
    const dataString = localStorage.getItem(COMPANY_PROFILE_KEY);
    return dataString ? JSON.parse(dataString) : null;
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

export const addClient = (name: string): ClientData[] => {
  const clients = getClients();
  const newClient = { id: `client_${Date.now()}`, name };
  const updatedClients = [...clients, newClient];
  saveClients(updatedClients);
  return updatedClients;
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
      // Ensure defaultQuantity and defaultUnit are numbers/strings or undefined
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
