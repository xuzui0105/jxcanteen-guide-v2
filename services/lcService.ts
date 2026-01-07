
const LC_APP_ID = "4wN1V8FprHFt3NdU60IUXZhh-MdYXbMMI";
const LC_APP_KEY = "6nCZ1fYSj7k0hv5FRYryLDRJ";
const LC_SERVER = "https://4wn1v8fp.api.lncldglobal.com";

const lcHeaders = () => ({
  "X-LC-Id": LC_APP_ID,
  "X-LC-Key": LC_APP_KEY,
  "Content-Type": "application/json"
});

export const lcQuery = async <T,>(className: string, whereObj?: object, extraQuery?: string): Promise<T[]> => {
  let queryStr = "";
  if (whereObj && Object.keys(whereObj).length > 0) {
    queryStr += "where=" + encodeURIComponent(JSON.stringify(whereObj));
  }
  if (extraQuery) {
    queryStr += (queryStr ? "&" : "") + extraQuery;
  }
  const url = `${LC_SERVER}/1.1/classes/${className}${queryStr ? `?${queryStr}` : ""}`;
  
  try {
    const res = await fetch(url, { headers: lcHeaders() });
    const data = await res.json();
    
    if (data.error) {
      // Error 101 means the class doesn't exist yet (hasn't been created via POST).
      // This is expected for new applications and should just return an empty array.
      if (data.code === 101) return [];
      console.error(`LC Query Error (${className}):`, JSON.stringify(data));
      return [];
    }
    return data.results || [];
  } catch (err) {
    console.error(`LC Fetch Error (${className}):`, err);
    return [];
  }
};

export const lcCreate = async (className: string, body: object) => {
  const res = await fetch(`${LC_SERVER}/1.1/classes/${className}`, {
    method: "POST",
    headers: lcHeaders(),
    body: JSON.stringify(body)
  });
  return await res.json();
};

export const lcUpdate = async (className: string, id: string, body: object) => {
  const res = await fetch(`${LC_SERVER}/1.1/classes/${className}/${id}`, {
    method: "PUT",
    headers: lcHeaders(),
    body: JSON.stringify(body)
  });
  return await res.json();
};

export const lcDelete = async (className: string, id: string) => {
  const res = await fetch(`${LC_SERVER}/1.1/classes/${className}/${id}`, {
    method: "DELETE",
    headers: lcHeaders()
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    console.error(`LC Delete Error (${className}):`, JSON.stringify(data));
  }
};
