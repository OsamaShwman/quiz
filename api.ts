
export const STEAMHUB_API_BASE = 'https://api.steamhub.cloud';

export interface ArtifactResponse {
  id: number;
  artifact_data: string; // The stringified JSON
  [key: string]: any;
}

export const fetchArtifact = async (id: string, token: string): Promise<string> => {
  const url = `${STEAMHUB_API_BASE}/studio/artifacts/info/${id}/`;
  console.log(`[API] GET ${url}`);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.error(`[API] GET Error ${response.status}: ${response.statusText}`);
    throw new Error(`Failed to fetch artifact: ${response.statusText}`);
  }

  const json = await response.json();
  console.log('[API] GET Success, data length:', json.artifact_data?.length || 0);

  return json.artifact_data || json.data?.artifact_data || "";
};

export const updateArtifact = async (id: string, token: string, data: string) => {
  const url = `${STEAMHUB_API_BASE}/studio/artifacts/update/${id}/`;
  console.log(`[API] PUT ${url}`);
  // console.log('[API] Payload Preview:', data.substring(0, 100) + '...');

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      artifact_data: data
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[API] PUT Error ${response.status}:`, errorText);
    throw new Error(`Failed to update artifact: ${response.statusText}`);
  }

  const resJson = await response.json();
  console.log('[API] PUT Success:', resJson);
  return resJson;
};
