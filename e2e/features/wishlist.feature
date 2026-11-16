Feature: Wishlist

  @smoke
  Scenario: move item from wishlist to cart
    Given I have 1 "watch" in the wishlist
    When I move it to the cart
    Then the wishlist is empty

  @regression
  Scenario: moving from an empty wishlist fails
    Given I have 0 "rings" in the wishlist
    When I move it to the cart
    Then the wishlist is empty
