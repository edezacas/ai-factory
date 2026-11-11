# Bulk discount

An order with 10 units or more in total, counting the quantity of every line, gets a discount on its total. The discount is 10 % of the total, rounded down to a whole cent. An order with fewer units pays the full total.

`totalCents` returns the total after the discount. An order with no lines, or with a quantity that is not a positive integer, still throws as today.
