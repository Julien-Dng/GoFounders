-- À exécuter à la mise en ligne, une fois les paiements Stripe en place (environment.paymentMode = 'stripe').
-- Supprime les fonctions qui accordaient des droits sans paiement réel.

drop function if exists public.simulate_purchase(text);
drop function if exists public.simulate_listing_purchase(text, uuid, text);

-- Identifiants clients Stripe créés en mode test : ils n'existent pas en mode réel et feraient échouer
-- le paiement des comptes concernés. Le back en recrée un au prochain achat.
update public.profiles set stripe_customer_id = null where stripe_customer_id is not null;
