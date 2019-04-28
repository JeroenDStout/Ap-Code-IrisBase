/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

#pragma once

#include "BlackRoot/Pubc/JSON.h"
#include "BlackRoot/Pubc/Files Types.h"

#include "Conduits/Pubc/Savvy Relay Receiver.h"

namespace IrisBack {
namespace Core {

	class ILayouts : public Conduits::SavvyRelayMessageReceiver {
		CON_RMR_DECLARE_CLASS(ILayouts, SavvyRelayMessageReceiver);

		using JSON = BlackRoot::Format::JSON;
		using Path = BlackRoot::IO::FilePath;

	public:
		virtual ~ILayouts() { ; }

		virtual void initialise(const JSON) = 0;
		virtual void deinitialise(const JSON) = 0;
        
        virtual void commence() = 0;
        virtual void end_and_wait() = 0;

        virtual bool async_relay_message(Conduits::Raw::IRelayMessage*) noexcept = 0;

		virtual JSON get_connexion_enumeration() const = 0;

        virtual void set_setup_dir(const Path) = 0;
        virtual Path get_setup_dir() = 0;

        CON_RMR_DECLARE_FUNC(set_setup_dir);
	};

}
}   