(function(){
  // Simple mock data SDK for local testing. Stores users in localStorage under 'mock_users'.
  const STORAGE_KEY = 'mock_users';
  let handler = null;

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch (e) {
      console.error('mock data_sdk: failed to load users', e);
      return [];
    }
  }

  function save(users) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    } catch (e) {
      console.error('mock data_sdk: failed to save users', e);
    }
  }

  function ensureBackendId(user) {
    if (!user.__backendId) {
      user.__backendId = 'b_' + Date.now() + '_' + Math.random().toString(36).substr(2,9);
    }
    return user;
  }

  window.dataSdk = {
    async init(h) {
      handler = h;
      const users = load();
      // ensure backend ids
      users.forEach(u => ensureBackendId(u));
      save(users);
      if (handler && typeof handler.onDataChanged === 'function') {
        try { handler.onDataChanged(users); } catch(e) { console.error(e); }
      }
      return { isOk: true };
    },

    async create(user) {
      try {
        const users = load();
        ensureBackendId(user);
        // basic duplicate phone check
        if (users.find(u => u.phone === user.phone)) {
          return { isOk: false, error: { message: 'phone_exists' } };
        }
        users.push(user);
        save(users);
        if (handler && typeof handler.onDataChanged === 'function') handler.onDataChanged(users);
        return { isOk: true };
      } catch (e) {
        console.error('mock create error', e);
        return { isOk: false, error: { message: e.message } };
      }
    },

    async update(updatedUser) {
      try {
        const users = load();
        const idx = users.findIndex(u => u.__backendId === updatedUser.__backendId || u.user_id === updatedUser.user_id);
        if (idx === -1) return { isOk: false, error: { message: 'not_found' } };
        users[idx] = { ...users[idx], ...updatedUser };
        save(users);
        if (handler && typeof handler.onDataChanged === 'function') handler.onDataChanged(users);
        return { isOk: true };
      } catch (e) {
        console.error('mock update error', e);
        return { isOk: false, error: { message: e.message } };
      }
    },

    async delete(userToDelete) {
      try {
        let users = load();
        users = users.filter(u => !(u.__backendId === userToDelete.__backendId || u.user_id === userToDelete.user_id));
        save(users);
        if (handler && typeof handler.onDataChanged === 'function') handler.onDataChanged(users);
        return { isOk: true };
      } catch (e) {
        console.error('mock delete error', e);
        return { isOk: false, error: { message: e.message } };
      }
    }
  };

  console.info('Mock dataSdk loaded (localStorage)', window.dataSdk ? true : false);
})();
