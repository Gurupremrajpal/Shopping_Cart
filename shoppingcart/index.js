const express = require("express");
const mysql = require('mysql');
const bcrypt = require('bcrypt');
const session = require('express-session');
const app = express();
const pool = dbConnection();

app.set("view engine", "ejs");
app.use(express.static("public"));

app.set('trust proxy', 1)
app.use(session({
	secret: 'secret_key',
	resave: false,
	saveUninitialized: true,
	cookie: { secure: true }
}));

//Needed to get values from form using POST method
app.use(express.urlencoded({extended:true}));

var globalUser = {};
console.log("Initial data before login: " + globalUser);

//routes
app.get('/', (req, res) => {
  res.render('login');
});

//Login functionality
app.post('/login', async (req, res) => {

  console.log("Inside login method");
  
  let userName = req.body.username;
  let userPassword = req.body.pwd;
  console.log(userPassword);

  let passwordHash = ""; //s3cr3t

  let sql = `SELECT * FROM user WHERE username = ?`;

  let data = await executeSQL(sql, [userName]);

  if(data.length > 0) {
    passwordHash = data[0].password;
  } 

  const matchPass = await bcrypt.compare(userPassword, passwordHash);

  if(matchPass){
    req.session.authenticated = true;
    console.log("Redirecting to Index page!");

    globalUser = data[0];

    console.log("Initial data after login: " + globalUser);

    res.redirect('/products');
  } else{
    res.render('login', {"error": "Invalid credentials"});
  }
});

//Index page
app.get('/index', isAuthenticated, (req, res) => {
  console.log("Showing index page!");
  res.render('index');
});


// app.get('/admin', req, res) => {
//   if (req.session.authenticated) {
//     res.render('admin');
//   } else {
//     res.redirect("/");
//   }
// }

//Logout functionality
app.get('/logout', (req, res) => {
  console.log("log out");
  globalUser = '';
  req.session.authenticated = false;
  req.session.destroy();
  res.redirect('/');
});


//Displays form for users to submit product info
app.get('/product/add', (req, res) => {
  console.log("Showing add product page!");
  //let page = res.render('addProduct');
  //document.getElementById('bodyData').innerHTML = page;
  res.render('addProduct');
});

//Stores product info in the database
app.post('/product/add', async (req, res) => {
  console.log("Inside add product method!");

	let name = req.body.product_name;
	let description = req.body.product_description;
	let price = req.body.product_price;
  let quantity =  req.body.product_quantity;
  let imageUrl = req.body.product_image_url;

	let sql = `INSERT INTO product (name, description, price, quantity, image_url) VALUES (?, ?, ?, ?, ?)`; //? are used to prevent sql injection

	let params = [name, description, price, quantity, imageUrl];
	let rows = await executeSQL(sql, params);
  
  res.render('addProduct', {'productInfo': rows, "message": "Product Added!"});
});

//Product List GET
app.get('/products', async (req, res) => {

  let userRole = globalUser.role;
  console.log("Inside product list - UserRole: " + userRole);

  if(userRole == "undefined" || userRole == null) {
    res.redirect("/logout");
  }

  let sql = "SELECT * FROM product ORDER BY name";
	let rows = await executeSQL(sql);

  res.render('productList', {'products': rows, 'userRole': userRole, 'userFullName': (globalUser.first_name + " " + globalUser.last_name)});
});

//Edit Product GET
app.get('/product/edit', async (req, res) => {
  let product_id = req.query.id;
	res.render('updateProduct', {'productId': product_id});
});

app.get('/product/edit/data', async (req, res) => {
	let product_id = req.query.id;
  let sql = `SELECT * FROM product 
						 WHERE id = ${product_id}`;
	let rows = await executeSQL(sql);

  res.send(rows);
	//res.render('updateProduct', {'productInfo': rows});
});

//Edit Product POST
app.post('/product/edit', async (req, res) => {
console.log("Inside update product method");
  console.log("Response: ", res);

	let product_id = req.body.id;

	let name = req.body.product_name;
	let description = req.body.product_description;
	let price = req.body.product_price;
  let quantity =  req.body.product_quantity;
  let imageUrl = req.body.product_image_url;

  let sql = `UPDATE product 
						 SET name = ?,
						 description = ?,
						 price = ?, 
						 quantity = ?,
             image_url = ?
						 WHERE id = ${product_id}`;
	let params = [name, description, price, quantity, imageUrl]
	let rows = await executeSQL(sql, params);

	sql = `SELECT * FROM product WHERE id = ${product_id}`;
	rows = await executeSQL(sql);
  //res.send(rows); 
	//res.render('updateProduct', {'productInfo': rows, "message": "Product Updated!"});
  res.redirect("/products")
});

app.get('/product/delete', async (req, res) => {
	let product_id = req.query.id;

  //Deleting product from mapping table inorder to delete product
  let productExistSql = `DELETE FROM user_products where product_id =  ${product_id}`;
  let rows = await executeSQL(productExistSql);

  //Deleting product
  let sql = `DELETE FROM product WHERE id = ${product_id}`;
	rows = await executeSQL(sql);

  res.redirect('/products');
});

//USER functionality
//user signup GET
app.get('/user/signup', async (req, res) => {
  res.render("signup");
});

//user signup POST
app.post('/user/signup', async (req, res) => {
  console.log("Inside signup method!");
  console.log("RequestBody: " + req.body.username);
  let username = req.body.username;
  let password = req.body.password;
  let firstname = req.body.first_name;
  let lastname = req.body.last_name;
  let emailId = req.body.email_id;
  let gender = req.body.gender; 
  let role = "USER";

  password = await hashPassword(password);
  
  let sql = `INSERT INTO user(username, password, role, first_name, last_name, email_id, gender) VALUES(?, ?, ?, ?, ?, ?, ?)`;
	let params = [username, password, role, firstname, lastname, emailId, gender];

	let rows = await executeSQL(sql, params);
  console.log(rows);

  res.redirect("/");
});

async function hashPassword(password) {
  const hash = await bcrypt.hash(password, 10)
  console.log(hash)
  console.log(await bcrypt.compare(password, hash))
  return hash;
}

//User List GET
app.get('/users', async (req, res) => {

  let userRole = globalUser.role;
  console.log("Inside User list - UserRole: " + userRole);

  if(userRole == "undefined" || userRole == null) {
    res.redirect("/logout");
  }

  let sql = `SELECT id, username, first_name, role, last_name, email_id, gender FROM user`;

	let rows = await executeSQL(sql);
	res.render('userList', {'users': rows, 'userRole': userRole});
});

//Edit User GET
app.get('/user/edit', async (req, res) => {
  console.log("Inside user edit get method!");
	let user_id = req.query.id;

  if(user_id == "undefined" || user_id == null) {
    res.redirect("/logout");
  }

  console.log("Fetching user edit page!");
	res.render('updateUser', {'userId': user_id});
});

app.get('/user/edit/data', async (req, res) => {
  console.log("Inside user edit get method!");
	let user_id = req.query.id;

  if(user_id == "undefined" || user_id == null) {
    res.redirect("/logout");
  }

  let sql = `SELECT * 
						 FROM user
						 WHERE id = ?`;
	let params = [user_id];
	let rows = await executeSQL(sql, params);
  
  res.send(rows);
  //console.log("Fetching user edit page!");
	
  //res.render('updateUser', {'userInfo': rows});
});

//Edit User POST
app.post('/user/edit', async (req, res) => {
	let user_id = req.body.id;

  let username = req.body.username;
  let firstname = req.body.first_name;
  let lastname = req.body.last_name;
  let emailId = req.body.email_id;
  let gender = req.body.gender; 
  let role = req.body.role;

  let sql = `UPDATE user SET username = ?, first_name = ?, last_name = ?, email_id = ?, gender = ?, role = ? WHERE id = ?`;
  let params = [username, firstname, lastname, emailId, gender, role, user_id];

	let rows = await executeSQL(sql, params);

	res.redirect('/users');
});

//Delete User GET
app.get('/user/delete', async (req, res) => {
	let user_id = req.query.id;

  let sql = `DELETE FROM user WHERE id = ${user_id}`;
	let rows = await executeSQL(sql);

  res.redirect('/users');
});

//Add Products to cart
app.post('/product/add/cart', async (req, res) => {
  console.log("Inside addToCart method");
	let user_id = globalUser.id;
  let product_id = req.body.productId;
  let product_cart_quantity = 1;

  if(user_id == "undefined" || user_id == null) {
    res.redirect("/logout");
  }

  console.log("Checking if product already exists...");
  let productCartQuantitySql = `SELECT product_cart_quantity FROM user_products WHERE user_id = ? AND product_id = ? AND is_purchased = "FALSE"`;
  let params = [user_id, product_id];
	let productCartQuantity = await executeSQL(productCartQuantitySql, params);

  let sql = "";
  let message = "";
  if(productCartQuantity == null || productCartQuantity == 0) {

    console.log("Adding product to cart...");
    sql = `INSERT into user_products (user_id, product_id, product_cart_quantity) VALUES (?, ?, ?)`;
    params = [user_id, product_id, 1];
	  let rows = await executeSQL(sql, params);
    console.log("Success, fetching products page with message!");
    message="Product added to cart!";
  } else {
    console.log("Failed, fetching products page with message!");
    message= "Product already added in cart!";
  }

  console.log("message:" + message);

  sql = "SELECT * FROM product ORDER BY name";
	let productList = await executeSQL(sql);
  res.render('productList', {'products': productList, 'userRole':globalUser.role, 'userFullName': (globalUser.first_name + " " + globalUser.last_name), 'message': message})
  //res.redirect("/products");
});

//Shopping Cart page GET
app.get("/cart", async (req, res) => {
  
	let user_id = globalUser.id;

  console.log("CART GET: userId: " + user_id);

  if(user_id == "undefined" || user_id == null) {
    res.redirect("/logout");
  } else {

  let userProductsSql = `SELECT * FROM user_products WHERE is_purchased = "FALSE" AND user_id = ${user_id}`;
	let userProducts = await executeSQL(userProductsSql);

  //console.log("UserProducts: " + userProducts);

  let productIds = [];
  for(let i = 0; i<userProducts.length; i++) {
    productIds.push(userProducts[i].product_id);
  }
  //console.log("ProductIds: " + productIds);

  let products = "";
  let total = 0;
  if(productIds != null && productIds.length > 0) {
    let productsSql = `SELECT * FROM product WHERE id in (${productIds})`;
    products = await executeSQL(productsSql);
    //console.log(products);

    for(let i = 0; i< products.length; i++) {
      total = (total + products[i].price);
    }
  }
  
  let userRole = globalUser.role;
  console.log("Inside GET Cart - UserRole: " + userRole);

  let message;
  if(products == "") {
    message = "Nothing in cart! Please add products to the cart";
  }
  res.render('cart', {'products': products, 'productTotal': total,'userRole': userRole, 'userId': user_id, 'emptyProductsMessage': message});
  }
  //res.redirect("/products");
});

//Removing products from cart
app.get('/user/products/delete', async (req, res) => {
	let product_id = req.query.product_id;

  let userRole = globalUser.role;

  if(userRole == "undefined" || userRole == null) {
    res.redirect("/logout");
  }

  let sql = `DELETE FROM user_products WHERE product_id = ${product_id}`;
	let rows = await executeSQL(sql);

  res.redirect("/cart");
});

//Checkout process
app.post('/cart/buy', async (req, res) => {
console.log("Inside buy method");
  console.log("Response: ", res.body);

  let user_id = req.body.userId;
  console.log("UserId: " + user_id);

	let product_id = req.body.productId;
  console.log("\nProductIds: " + productId);

  let quantity =  req.body.product_cart_quantity;
  console.log("\nproductCartQuantity: " + product_cart_quantity);

  // let sql = `UPDATE user_products 
	// 					 SET is_purchased = true
	// 					 WHERE id = ${product_id}`;
	// let params = [name, description, price, quantity, imageUrl]
	// let rows = await executeSQL(sql, params);

	// sql = `SELECT * FROM product WHERE id = ${product_id}`;
	// rows = await executeSQL(sql);

	//res.render('updateProduct', {'productInfo': rows, "message": "Product Updated!"});
  res.redirect("/cart")
});

//Profile
app.get('/profile', async (req, res) => {
  console.log("Showing profile page!");

  let userRole = globalUser.role;

  if(userRole == "undefined" || userRole == null) {
    res.redirect("/logout");
  }

  let sql = `SELECT id, username, first_name, role, last_name, email_id, gender FROM user WHERE id = ` + globalUser.id;
  console.log("sql: " + sql);
	let rows = await executeSQL(sql);
  
  res.render('profile', {'userInfo': rows[0]});
});

app.post('/checkout', async (req, res) => {
  console.log("Inside Checkout method!");

  let user_id = globalUser.id;

  if(user_id == "undefined" || user_id == null) {
    res.redirect("/logout");
  } else {

  let userProductsSql = `SELECT id FROM user_products WHERE is_purchased = "FALSE" AND user_id = ${user_id}`;
	let userProducts = await executeSQL(userProductsSql);

  let userProductIds = [];
  for(let i = 0; i<userProducts.length; i++) {
    userProductIds.push(userProducts[i].id);
  }

  console.log("Product Ids: " + userProductIds);

  let updateUserProductsSql = `UPDATE user_products SET is_purchased = "TRUE" WHERE id in (${userProductIds})`;
  let updatedUserProducts = await executeSQL(updateUserProductsSql);

  let products = "";
  let total = 0;
  
  let userRole = globalUser.role;
  console.log("Inside GET Cart - UserRole: " + userRole);

  res.render('cart', {'productTotal': total,'userRole': userRole, 'userId': user_id, 'message': "Purchase Successful"});
  }

});


app.get("/dbTest", async function(req, res){
	let sql = "SELECT CURDATE()";
	let rows = await executeSQL(sql);
	res.send(rows);
});//dbTest


//functions
async function executeSQL(sql, params){
return new Promise (function (resolve, reject) {
	pool.query(sql, params, function (err, rows, fields) {
		if (err) throw err;
			resolve(rows);
		});
	});
}//executeSQL
//values in red must be updated
function dbConnection(){

   const pool  = mysql.createPool({

      connectionLimit: 10,
      host: "en1ehf30yom7txe7.cbetxkdyhwsb.us-east-1.rds.amazonaws.com",
      user: "ereykugv8x71l19a",
      password: "b07s5nj02g91h4pi",
      database: "lvkilyr9brjlhyjo"

   }); 

   return pool;

}//dbConnection

function isAuthenticated(req, res, next){
  if (req.session.authenticated){
    next();
  } else {
    res.redirect("/");
  }
}

//start server
app.listen(3000, () => {
	console.log("Expresss server running...")
});