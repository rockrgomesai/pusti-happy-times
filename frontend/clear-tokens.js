// Clear any stored tokens and cookies for debugging
// Run this in browser console

// Clear localStorage
localStorage.clear();

// Clear sessionStorage  
sessionStorage.clear();

// Clear cookies for localhost
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});

console.log('All tokens and cookies cleared. Try logging in again.');
