import axiosClient from './axiosClient';

export const seedDemoData = async (data = {}) => {
  const response = await axiosClient.post('/admin/seed-demo-data', data);
  return response.data;
};

export const generateInfrastructureHistory = async (data = {}) => {
  const response = await axiosClient.post('/admin/generate-infrastructure-history', data);
  return response.data;
};