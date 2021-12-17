var productTotal = [0,0,0,0,0,0,0,0,0,0,0,0,0];
var subTotal = 0;
var shippingCost = 0;

function mapData(index, value, price) {

  let total = price*value;

  productTotal[index] = total;

  window.productTotal = productTotal;
  console.log("----> " + window.productTotal);

  $(`#total${index}`).html(`${total}`);

  calculateSubTotal();
  totalPurchaseValue();
}

function calculateSubTotal() {

  productTotal = window.productTotal;
  subTotal = 0;
  for(let i = 0; i<productTotal.length; i++) {
    subTotal = (subTotal + productTotal[i]);
  }
  
  console.log("CalculateSubTotal" + subTotal);
  subTotal = subTotal + shippingCost;
  $('#subTotal').html(subTotal);
}

function totalPurchaseValue() {

  $('#total').html(subTotal);
}

//$("#applyBtn").on("click", applyPromo);



// $("#qtyItem1").on("change",qty1_Cal);
//document.querySelector("#shippingDrop").addEventListener("change", applyShipping);

// async function applyPromo() {
//   console.log("In the function ");

//   let givenCode = $("#code").val();
//   let url = `https://itcdland.csumb.edu/~milara/ajax/promo/promoCode.php?promoCode=${givenCode}`;
//   let data = await fetchData(url);
//   console.log(data);

//   if (data == false) {
//     $("#errorMsg").show();
//     $("#errorMsg").html("<div class = 'alert-danger'>Promo code doesn't exist!</div>")
//   } else {
//     $("#errorMsg").hide();
//     window.discount = data.discount;
//     applyDiscount();
//   }
// }

// function applyDiscount() {
//   $("#discountPercent").html(window.discount + '%')
//   let productVal1 = window.total1;
//   let totalValue = productVal1;

//   let totalDiscount = 0;
//   if (window.discount == 50) {
//     totalDiscount = totalValue - (totalValue * (1 - 0.5));
//   } else if (window.discount == 30) {
//     totalDiscount = totalValue - (totalValue * (1 - 0.3));
//   } else if (window.discount == 20) {
//     totalDiscount = totalValue - (totalValue * (1 - 0.2));
//   }

//   $("#discountedPrice").html("-$" + totalDiscount);

//   window.subTotal = window.subTotal - totalDiscount;
//   $("#subTotal").html('$' + subTotal);
//   updateTotal();
// }

function updateTotal() {
   let tax = Math.round(subTotal - (subTotal * (1 - 0.1)));
   $("#tax").html("$" + tax);

   let total = (subTotal + tax);
   $("#total").html("$" + total);
}

function applyShipping() {
  console.log("Inside applyShipping")

  let shippingValue = $("#shippingDrop").val();

  let shippingCostNew = 0;
  if (shippingValue == "nxtday") {
    shippingCostNew = 25;
  } else if (shippingValue == "threeday") {
    shippingCostNew = 20;
  } else {
    shippingCostNew = 7;
  }

  if(shippingCost == 0) {
    shippingCost = shippingCostNew;
    subTotal = subTotal + shippingCost;
  } else {
    subTotal = subTotal - shippingCost;
    subTotal = subTotal + shippingCostNew;
    shippingCost = shippingCostNew;
  }

  $("#totalShipping").html('$' + shippingCostNew); 

  calculateSubTotal();
}