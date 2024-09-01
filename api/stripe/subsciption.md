# Subscription Lifecyle

### is_subscribed

This is a field on the Restaurant and each of its Locations which is

```
   1 on location creation, set is_subscribed to mirror restaurant
   2 on successful subscription we need to set rest and all locations to is_subscribed true
   3 on failed payment we need to set restaurant and all its locations to is_subscribed false
   4 on successful payment, check if rest is_subsribed is false and if so set rest and all its locations to is_subscribed true
```
