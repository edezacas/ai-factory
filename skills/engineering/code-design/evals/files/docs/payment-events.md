# Payment provider

## Webhooks

The provider sends an HTTP POST with a JSON event to our webhook URL.

### charge.succeeded

Sent when a charge is captured.

```json
{
  "id": "evt_1J2k3L",
  "type": "charge.succeeded",
  "data": {
    "chargeId": "ch_9Xy8Zw",
    "customerId": "c1",
    "amountCents": 1000
  }
}
```

`id` is unique per event.
