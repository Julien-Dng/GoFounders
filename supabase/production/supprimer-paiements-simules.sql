-- À exécuter à la mise en ligne, une fois les paiements Stripe en place (environment.paymentMode = 'stripe').
-- Supprime les fonctions qui accordaient des droits sans paiement réel.

drop function if exists public.simulate_purchase(text);
drop function if exists public.simulate_listing_purchase(text, uuid, text);
