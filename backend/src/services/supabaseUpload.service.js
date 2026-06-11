import { supabase } from '../config/supabase.js';
import path from 'path';

export async function uploadToSupabase(file, prefix = 'doc') {
  if (!file) throw new Error('No file provided');

  const ext = path.extname(file.originalname).toLowerCase();
  const uniqueName = `${prefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

  const { data, error } = await supabase.storage
    .from('attachments')
    .upload(uniqueName, file.buffer, {
      contentType: file.mimetype,
      upsert: false
    });

  if (error) {
    throw new Error(`Supabase upload failed: ${error.message}`);
  }

  // We only return the unique filename so we can query it later to create a signed URL
  return uniqueName;
}
