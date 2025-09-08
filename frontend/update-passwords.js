use pusti_happy_times;

// Update superadmin password with bcrypt hash
db.users.updateOne(
  {username: "superadmin"}, 
  {$set: {password: "$2a$12$vTwEoFS/Oag9D77KSOGvSe8oq/mDGdkci9u7chGCOWXz65jDDdz9a"}}
);

// Update demo password with bcrypt hash  
db.users.updateOne(
  {username: "demo"}, 
  {$set: {password: "$2a$12$Q4SD3l/vZXh8TL9nDj102.nLC8NGpO8W9hPMbtXCmvvPVH3BLUonm"}}
);

print("Passwords updated with bcrypt hashes");
print("superadmin password: admin123");
print("demo password: demo123");
