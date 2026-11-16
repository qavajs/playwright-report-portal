Feature: Checkout

  @smoke @regression
  Scenario: successful checkout
    Given I have 2 "apples" in the cart
    When I check out
    Then the order is confirmed

  @owner
  Scenario: checkout with debug info attached
    Given I have 1 "banana" in the cart
    When I attach debug info
    Then the order is confirmed

  @attachments
  Scenario: checkout with attachments
    Given I have 1 "banana" in the cart
    When I attach debug info
    And I attach a screenshot
    Then the order is confirmed

  @regression
  Scenario: checkout fails with an empty cart
    Given I have 0 "oranges" in the cart
    When I check out
    Then the order is confirmed

  @regression
  Scenario: checkout with multiple items and a note
    Given I have the following items in the cart:
      | item   | count |
      | apples | 2     |
      | pears  | 3     |
    And I add the following note to the order:
      """
      Please deliver after 6pm.
      """
    When I check out
    Then the order is confirmed
